import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Money for one booking counted from BOTH ledgers:
 *  - `orders`            → online payments confirmed by the provider
 *  - `booking_payments`  → manually recorded money (cash, card to guide, bank…)
 *
 * Rows in `booking_payments` that point at an order are already counted through
 * the order, so they never add twice.
 */
export type SettlementTotals = {
  totalCents: number;
  onlineCents: number;
  manualCents: number;
  paidCents: number;
  refundCents: number;
  remainingCents: number;
  overpaidCents: number;
};

export function bookingTotalCents(b: {
  amount_total?: number | null;
  total_estimate?: number | null;
}) {
  if (b.amount_total != null && Number(b.amount_total) > 0) return Number(b.amount_total);
  if (b.total_estimate != null) return Math.round(Number(b.total_estimate) * 100);
  return 0;
}

export function computeSettlement(
  booking: { amount_total?: number | null; total_estimate?: number | null; refund_cents?: number | null },
  orders: { amount_total: number | null; payment_status: string | null }[],
  manual: { amount_cents: number | null; direction: string; order_id: string | null }[],
): SettlementTotals {
  const totalCents = bookingTotalCents(booking);

  const onlineCents = orders
    .filter((o) => o.payment_status === "paid" || o.payment_status === "partially_refunded")
    .reduce((n, o) => n + Number(o.amount_total || 0), 0);

  const manualCents = manual
    .filter((m) => !m.order_id && m.direction === "payment")
    .reduce((n, m) => n + Number(m.amount_cents || 0), 0);

  const manualRefund = manual
    .filter((m) => m.direction === "refund")
    .reduce((n, m) => n + Number(m.amount_cents || 0), 0);

  const refundCents = Math.max(Number(booking.refund_cents || 0), manualRefund);
  const gross = onlineCents + manualCents;
  const paidCents = Math.max(0, gross - refundCents);

  return {
    totalCents,
    onlineCents,
    manualCents,
    paidCents,
    refundCents,
    remainingCents: Math.max(0, totalCents - paidCents),
    overpaidCents: totalCents > 0 ? Math.max(0, paidCents - totalCents) : 0,
  };
}

/** Where a booking stands on settling its balance. */
export type SettlementStatus =
  | "fully_settled"
  | "partially_paid"
  | "pending_balance"
  | "discrepancy";

export function settlementStatus(
  t: SettlementTotals,
  opts: { cancelled: boolean; markedPaid: boolean; hasDiscrepancy: boolean },
): SettlementStatus {
  if (opts.hasDiscrepancy) return "discrepancy";
  if (opts.cancelled) return "fully_settled";
  if (t.totalCents > 0 && t.remainingCents <= 0) return "fully_settled";
  if (t.paidCents > 0) return "partially_paid";
  return "pending_balance";
}

/**
 * Recomputes a booking's payment status from BOTH ledgers after any settlement
 * is added, edited or undone. Never invents money: a booking only reads as paid
 * when the recorded amounts actually cover its total.
 */
export async function syncBookingSettlement(
  supabase: SupabaseClient<Database>,
  bookingId: string,
) {
  const { data: b } = await supabase
    .from("bookings")
    .select("id,status,payment_status,amount_total,total_estimate,refund_cents,payment_request_cents")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return null;

  const [{ data: orders }, { data: manual }] = await Promise.all([
    supabase.from("orders").select("amount_total,payment_status").eq("booking_id", bookingId),
    supabase
      .from("booking_payments")
      .select("amount_cents,direction,order_id")
      .eq("booking_id", bookingId),
  ]);

  const totals = computeSettlement(b as any, (orders ?? []) as any, (manual ?? []) as any);
  if (b.status === "cancelled") return totals;

  const patch: {
    payment_status?: string;
    status?: string;
    payment_request_cents?: number | null;
  } = {};

  if (totals.totalCents > 0 && totals.remainingCents <= 0) {
    patch.payment_status = totals.refundCents > 0 ? "partially_refunded" : "paid";
    patch.payment_request_cents = null;
    if (b.status !== "cancelled" && b.status !== "done") patch.status = "confirmed";
  } else if (totals.paidCents > 0) {
    patch.payment_status = "deposit_paid";
    if (b.status === "new") patch.status = "confirmed";
  } else if (b.payment_status === "paid" || b.payment_status === "deposit_paid") {
    // Everything was undone — the booking must stop looking paid.
    patch.payment_status = "unpaid";
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from("bookings").update(patch).eq("id", bookingId);
  }
  return totals;
}
