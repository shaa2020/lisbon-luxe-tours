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
      "id,tour_title,customer_name,travel_date,travel_time,guests,amount_total,total_estimate,status,payment_status",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;

  const { data: orders } = await supabase
    .from("orders")
    .select("amount_total,payment_status")
    .eq("booking_id", bookingId);

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
    status: String(b.status || ""),
    paymentStatus: (b.payment_status as string) || null,
    cancelled: b.status === "cancelled",
  };
}
