import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PaymentLineItem } from "./payments.server";

/** Surcharge per guest above the first two, mirrored by the "Extra guest" product. */
export const EXTRA_GUEST_FEE_CENTS = 3500;

/** Human-readable price id for a tour's base price in the payment provider. */
export function tourPriceId(slug: string): string {
  return `tour_${slug.replace(/-/g, "_")}_base`;
}

/**
 * Split a booking total into catalog line items (base tour + add-ons) so each
 * one is reported against its own product. Falls back to a single line when the
 * numbers don't add up, e.g. after a manual price override.
 */
export function buildTourLineItems(input: {
  tourSlug: string;
  tourTitle: string;
  guests: number;
  totalCents: number;
  baseCents: number | null;
  pickupFeeCents: number;
  pickupRequested: boolean;
}): PaymentLineItem[] {
  const extrasQty = Math.max(0, input.guests - 2);
  const extrasCents = extrasQty * EXTRA_GUEST_FEE_CENTS;
  const pickupCents = input.pickupRequested ? Math.max(0, input.pickupFeeCents) : 0;
  const base = input.baseCents ?? input.totalCents - extrasCents - pickupCents;

  if (base <= 0 || base + extrasCents + pickupCents !== input.totalCents) {
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
    { priceId: tourPriceId(input.tourSlug), name: input.tourTitle, unitAmountCents: base, quantity: 1 },
  ];
  if (extrasQty > 0) {
    items.push({
      priceId: "tour_extra_guest_fee",
      name: "Extra guest",
      unitAmountCents: EXTRA_GUEST_FEE_CENTS,
      quantity: extrasQty,
    });
  }
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
