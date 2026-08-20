import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PaymentLineItem } from "./payments.server";
import { quote, parseGroupTiers } from "./pricing";

/** Every booking is priced per person and needs at least this many guests. */
export const MIN_GUESTS = 2;

/** Human-readable price id for a tour's base price in the payment provider. */
export function tourPriceId(slug: string): string {
  return `tour_${slug.replace(/-/g, "_")}_base`;
}

/**
 * Split a booking total into catalog line items (per-person tour + add-ons) so
 * each one is reported against its own product. Falls back to a single line when
 * the numbers don't add up, e.g. after a manual price override.
 */
export function buildTourLineItems(input: {
  tourSlug: string;
  tourTitle: string;
  guests: number;
  totalCents: number;
  /** Per-person rate in cents. */
  baseCents: number | null;
  pickupFeeCents: number;
  pickupRequested: boolean;
}): PaymentLineItem[] {
  const guests = Math.max(MIN_GUESTS, input.guests);
  const pickupCents = input.pickupRequested ? Math.max(0, input.pickupFeeCents) : 0;
  const perPerson = input.baseCents ?? Math.round((input.totalCents - pickupCents) / guests);

  if (perPerson <= 0 || perPerson * guests + pickupCents !== input.totalCents) {
    return [
      {
        priceId: tourPriceId(input.tourSlug),
        name: input.tourTitle,
        unitAmountCents: input.totalCents,
        quantity: 1,
      },
    ];
  }

  const items: PaymentLineItem[] = [
    {
      priceId: tourPriceId(input.tourSlug),
      name: `${input.tourTitle} (per person)`,
      unitAmountCents: perPerson,
      quantity: guests,
    },
  ];
  if (pickupCents > 0) {
    items.push({
      priceId: "tour_hotel_pickup_fee",
      name: "Hotel pickup & drop-off",
      unitAmountCents: pickupCents,
      quantity: 1,
    });
  }
  return items;
}

/** Base price (in cents) for a tour, honouring the sale price set in the admin panel. */
export async function tourBaseCents(
  supabase: SupabaseClient<Database>,
  slug: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("tours")
    .select("price_from, sale_price")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const euros = data.sale_price ?? data.price_from;
  return euros ? Math.round(euros * 100) : null;
}

/** Refuse a checkout when the requested time slot is already fully booked. */
export async function assertSlotAvailable(
  supabase: SupabaseClient<Database>,
  date: string | null | undefined,
  time: string | null | undefined,
) {
  if (!date || !time) return;
  const { data: settings } = await supabase
    .from("site_settings")
    .select("daily_slot_capacity")
    .eq("id", true)
    .maybeSingle();
  const capacity = Math.max(1, settings?.daily_slot_capacity ?? 3);

  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("travel_date", date)
    .eq("travel_time", time)
    .neq("status", "cancelled");

  if ((count ?? 0) >= capacity) {
    throw new Error("That time slot has just been taken. Please choose another time.");
  }
}

/**
 * Authoritative price for a tour booking. The client's number is display only —
 * checkout always re-prices from the tour row, the group discount tiers and the
 * hotel pickup fee stored in the database.
 */
export async function quoteTourCents(
  supabase: SupabaseClient<Database>,
  input: { slug: string; guests: number; pickupRequested: boolean },
): Promise<{ totalCents: number; perPersonCents: number; pickupFeeCents: number; guests: number } | null> {
  const { data: tour } = await supabase
    .from("tours")
    .select("price_from, sale_price, per_person_pricing")
    .eq("slug", input.slug)
    .maybeSingle();
  if (!tour) return null;

  const { data: settings } = await supabase
    .from("site_settings")
    .select("hotel_pickup_fee_cents, group_discount_tiers, group_discount_enabled")
    .eq("id", true)
    .maybeSingle();

  const pickupFeeCents = Math.max(0, Number((settings as never as { hotel_pickup_fee_cents?: number })?.hotel_pickup_fee_cents ?? 0));
  const perPersonEuros = Number(tour.sale_price ?? tour.price_from) || 0;
  if (perPersonEuros <= 0) return null;

  const q = quote({
    perPerson: perPersonEuros,
    guests: input.guests,
    perPersonPricing: (tour as never as { per_person_pricing?: boolean }).per_person_pricing !== false,
    pickupFee: pickupFeeCents / 100,
    pickupRequested: input.pickupRequested,
    tiers: parseGroupTiers((settings as never as { group_discount_tiers?: unknown })?.group_discount_tiers),
    tiersEnabled: (settings as never as { group_discount_enabled?: boolean })?.group_discount_enabled !== false,
  });

  return {
    totalCents: Math.round(q.total * 100),
    perPersonCents: Math.round(q.effectivePerPerson * 100),
    pickupFeeCents: Math.round(q.pickup * 100),
    guests: q.guests,
  };
}
