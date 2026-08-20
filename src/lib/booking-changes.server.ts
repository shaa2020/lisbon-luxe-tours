import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";


type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function fetchBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  email?: string,
) {
  const ref = bookingId.trim().replace(/^#/, "");

  if (UUID_RE.test(ref)) {
    let query = supabase.from("bookings").select("*").eq("id", ref);
    if (email) query = query.ilike("email", email);
    const { data, error } = await query.single();
    if (error) throw error;
    return data as BookingRow;
  }

  // Customers only see the short reference (first 8 characters of the id),
  // so match on that prefix. Requires the email for safety.
  if (!email) throw new Error("Booking not found");
  const short = ref.toLowerCase();
  if (short.length < 6) throw new Error("Booking not found");

  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const match = (data ?? []).find((b) => b.id.toLowerCase().startsWith(short));
  if (!match) throw new Error("Booking not found");
  return match as BookingRow;
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
      const perPerson = selections.reduce((s, c) => s + (c.price_cents || 0), 0);
      const guests = Math.max(2, options.newGuests);
      const newAmount = perPerson * guests + pickupCents;
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
      const guests = Math.max(2, options.newGuests);
      const newAmount = baseCents * guests + pickupCents;
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

export async function createModificationPayment(
  booking: BookingRow,
  modificationId: string,
  differenceCents: number,
  origin: string,
) {
  const { createPayment } = await import("./payments.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return createPayment(supabaseAdmin, {
    amountCents: differenceCents,
    description: `Tour change · ${booking.tour_title || "Booking"} · ref ${booking.id.slice(0, 8)}`,
    origin,
    lineItems: [
      {
        priceId: "booking_change_extra",
        name: `Booking change · ${booking.tour_title || "Booking"}`,
        unitAmountCents: differenceCents,
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: booking.id,
      tour_slug: booking.tour_slug || "",
      guests: String(booking.guests || 1),
      modification_id: modificationId,
    },
  });

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
