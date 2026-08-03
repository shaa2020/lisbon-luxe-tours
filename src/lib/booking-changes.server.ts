import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const EXTRA_GUEST_CENTS = 3500;

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export async function fetchBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  email?: string,
) {
  let query = supabase.from("bookings").select("*").eq("id", bookingId);
  if (email) query = query.ilike("email", email);
  const { data, error } = await query.single();
  if (error) throw error;
  return data as BookingRow;
}

export function hasPickupInNotes(notes: string | null) {
  if (!notes) return false;
  return /Hotel pickup.*?requested/i.test(notes);
}

export function extractPickupCents(notes: string | null, defaultFeeCents: number) {
  if (!hasPickupInNotes(notes)) return 0;
  const match = notes?.match(/\+€(\d+)/);
  if (match) return Number(match[1]) * 100;
  return defaultFeeCents;
}

export async function calculateModificationAmount(
  supabase: SupabaseClient<Database>,
  booking: BookingRow,
  options: {
    newGuests?: number;
    newAmountCents?: number;
    hotelPickupFeeCents?: number;
  },
) {
  const oldGuests = booking.guests || 1;
  const oldAmount = booking.amount_total || 0;
  const pickupCents = extractPickupCents(booking.notes, options.hotelPickupFeeCents || 0);

  if (typeof options.newAmountCents === "number") {
    return {
      newGuests: options.newGuests ?? oldGuests,
      newAmountCents: options.newAmountCents,
      oldGuests,
      oldAmount,
      differenceCents: options.newAmountCents - oldAmount,
    };
  }

  if (typeof options.newGuests === "number" && options.newGuests !== oldGuests) {
    if (booking.tour_slug === "custom" && Array.isArray(booking.custom_selections)) {
      const selections = booking.custom_selections as {
        price_cents: number;
        extra_per_guest_cents: number;
      }[];
      const baseTotal = selections.reduce((s, c) => s + (c.price_cents || 0), 0);
      const extraPerGuest = selections.reduce((s, c) => s + (c.extra_per_guest_cents || 0), 0);
      const extraGuests = Math.max(0, options.newGuests - 2);
      const newAmount = baseTotal + extraPerGuest * extraGuests + pickupCents;
      return {
        newGuests: options.newGuests,
        newAmountCents: newAmount,
        oldGuests,
        oldAmount,
        differenceCents: newAmount - oldAmount,
      };
    }

    if (booking.tour_slug) {
      const { data: tour } = await supabase
        .from("tours")
        .select("price_from, sale_price")
        .eq("slug", booking.tour_slug)
        .maybeSingle();
      const priceFrom = tour?.price_from || 0;
      const salePrice = tour?.sale_price;
      const baseCents =
        typeof salePrice === "number" && salePrice > 0 && salePrice < priceFrom
          ? salePrice * 100
          : priceFrom * 100;
      const newExtras = Math.max(0, options.newGuests - 2) * EXTRA_GUEST_CENTS;
      const newAmount = baseCents + newExtras + pickupCents;
      return {
        newGuests: options.newGuests,
        newAmountCents: newAmount,
        oldGuests,
        oldAmount,
        differenceCents: newAmount - oldAmount,
      };
    }
  }

  return {
    newGuests: oldGuests,
    newAmountCents: oldAmount,
    oldGuests,
    oldAmount,
    differenceCents: 0,
  };
}

export async function createStripeModificationSession(
  stripeFetch: (path: string, init?: { method?: string; form?: Record<string, string> }) => Promise<any>,
  booking: BookingRow,
  modificationId: string,
  differenceCents: number,
  origin: string,
) {
  const form: Record<string, string> = {
    mode: "payment",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "eur",
    "line_items[0][price_data][unit_amount]": String(differenceCents),
    "line_items[0][price_data][product_data][name]": `Tour change — ${booking.tour_title || "Booking"}`,
    "line_items[0][price_data][product_data][description]": `Extra guests or tour extension for booking ${booking.id.slice(0, 8)}`.slice(0, 500),
    customer_email: booking.email,
    success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/cancelled?session_id={CHECKOUT_SESSION_ID}`,
    "metadata[booking_id]": booking.id,
    "metadata[tour_slug]": booking.tour_slug || "",
    "metadata[guests]": String(booking.guests || 1),
    "metadata[modification_id]": modificationId,
  };

  return stripeFetch("/v1/checkout/sessions", { method: "POST", form });
}

export async function applyModificationToBooking(
  supabase: SupabaseClient<Database>,
  modificationId: string,
) {
  const { data: mod, error: modErr } = await supabase
    .from("booking_modifications")
    .select("*, bookings(*)")
    .eq("id", modificationId)
    .single();
  if (modErr || !mod) throw modErr || new Error("Modification not found");

  const newValue = (mod.new_value || {}) as { guests?: number; amount_cents?: number };
  const booking = mod.bookings as BookingRow;

  const updates: Partial<BookingRow> = {};
  if (typeof newValue.guests === "number") updates.guests = newValue.guests;
  if (typeof newValue.amount_cents === "number") {
    updates.amount_total = newValue.amount_cents;
    updates.total_estimate = Math.round(newValue.amount_cents / 100);
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("bookings").update(updates).eq("id", booking.id);
    if (error) throw error;
  }

  const { error } = await supabase
    .from("booking_modifications")
    .update({ status: "applied", payment_status: "paid" })
    .eq("id", modificationId);
  if (error) throw error;

  return { bookingId: booking.id, updates };
}
