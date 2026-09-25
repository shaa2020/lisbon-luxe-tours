import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type BookingBalance = {
  bookingId: string;
  customerFirstName: string;
  tourTitle: string | null;
  travelDate: string | null;
  travelTime: string | null;
  guests: number;
  totalCents: number;
  paidCents: number;
  dueCents: number;
  /** Amount the customer is asked to pay right now (deposit request or full balance). */
  requestCents: number;
  /** True when a partial deposit (not the full balance) is being requested. */
  isDeposit: boolean;
  status: string;
  paymentStatus: string | null;
  cancelled: boolean;
};

/**
 * How much of a booking has been paid online so far, from the orders ledger.
 * A booking is fully paid when the sum of paid orders covers amount_total
 * (falling back to total_estimate in euros for older rows).
 */
export async function computeBookingBalance(
  supabase: SupabaseClient<Database>,
  bookingId: string,
): Promise<BookingBalance | null> {
  const { data: b } = await supabase
    .from("bookings")
    .select(
      "id,tour_title,customer_name,travel_date,travel_time,guests,amount_total,total_estimate,status,payment_status,payment_request_cents",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;

  // Gratuities live in the same ledger but are never part of the fare.
  const { data: orders } = await supabase
    .from("orders")
    .select("amount_total,payment_status")
    .eq("booking_id", bookingId)
    .neq("kind", "tip");

  const paidCents = (orders ?? [])
    .filter((o: any) => o.payment_status === "paid")
    .reduce((sum: number, o: any) => sum + Number(o.amount_total || 0), 0);

  const totalCents =
    b.amount_total != null
      ? Number(b.amount_total)
      : b.total_estimate != null
        ? Math.round(Number(b.total_estimate) * 100)
        : 0;

  const dueCents = Math.max(0, totalCents - paidCents);

  // A stored payment request asks for a specific amount now (e.g. a 20%
  // deposit). It never exceeds what is actually still due.
  const storedRequest = Number((b as any).payment_request_cents ?? 0);
  const requestCents =
    storedRequest > 0 ? Math.min(storedRequest, dueCents) : dueCents;

  return {
    bookingId: b.id as string,
    customerFirstName: String(b.customer_name || "there").split(" ")[0],
    tourTitle: (b.tour_title as string) || null,
    travelDate: (b.travel_date as string) || null,
    travelTime: (b.travel_time as string) || null,
    guests: Number(b.guests || 1),
    totalCents,
    paidCents,
    dueCents,
    requestCents,
    isDeposit: requestCents > 0 && requestCents < dueCents,
    status: String(b.status || ""),
    paymentStatus: (b.payment_status as string) || null,
    cancelled: b.status === "cancelled",
  };
}

/**
 * Recomputes a booking's payment status from the orders ledger after a
 * payment lands: fully covered → "paid", partially covered → "deposit_paid".
 * The request marker is cleared once the requested amount has been paid.
 */
export async function syncBookingPaymentStatus(
  supabase: SupabaseClient<Database>,
  bookingId: string,
) {
  const balance = await computeBookingBalance(supabase, bookingId);
  if (!balance || balance.cancelled || balance.totalCents <= 0) return;

  const paymentStatus =
    balance.dueCents <= 0 ? "paid" : balance.paidCents > 0 ? "deposit_paid" : null;

  const patch: { payment_status?: string; status?: string; payment_request_cents?: null } = {};

  // Nothing confirmed by the provider → never leave the booking looking paid.
  if (
    !paymentStatus &&
    (balance.paymentStatus === "paid" || balance.paymentStatus === "deposit_paid")
  ) {
    await supabase
      .from("bookings")
      .update({ payment_status: "unpaid" })
      .eq("id", bookingId);
    return;
  }

  if (paymentStatus) {
    patch.payment_status = paymentStatus;
    if (balance.paidCents > 0 && balance.status !== "cancelled") patch.status = "confirmed";
  }
  if (balance.paidCents >= balance.requestCents) {
    patch.payment_request_cents = null;
  }
  if (Object.keys(patch).length === 0) return;
  await supabase.from("bookings").update(patch).eq("id", bookingId);
}
