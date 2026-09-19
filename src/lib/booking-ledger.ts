/**
 * Shared, read-only helpers that derive what the admin needs to see for each
 * booking: how much money has actually arrived, where the tour stands, and
 * which section of the bookings page the booking belongs in.
 *
 * Money is never invented here — it is summed from the orders ledger (online
 * payments confirmed by the provider) plus manually recorded payments in
 * `booking_payments` that are not already linked to an order.
 */

export type LedgerBooking = {
  id: string;
  status: string;
  tour_status?: string | null;
  payment_status?: string | null;
  travel_date: string | null;
  travel_time?: string | null;
  amount_total?: number | null;
  total_estimate?: number | null;
  refund_cents?: number | null;
};

export type PaidRow = { booking_id: string | null; amount_total: number; payment_status: string };
export type ManualRow = {
  booking_id: string;
  amount_cents: number;
  direction: string;
  order_id: string | null;
};

export type TourStage = "upcoming" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type PaymentState =
  | "unpaid"
  | "deposit_paid"
  | "partially_paid"
  | "fully_paid"
  | "payment_due"
  | "refunded"
  | "partially_refunded";

export type BookingSection =
  | "today"
  | "upcoming"
  | "payment_due"
  | "completed_due"
  | "history"
  | "cancelled";

export type BookingLedger = {
  totalCents: number;
  paidCents: number;
  refundCents: number;
  dueCents: number;
  tourStage: TourStage;
  paymentState: PaymentState;
  section: BookingSection;
};

export const TOUR_STAGE_LABEL: Record<TourStage, string> = {
  upcoming: "Upcoming",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export const PAYMENT_STATE_LABEL: Record<PaymentState, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit paid",
  partially_paid: "Partially paid",
  fully_paid: "Fully paid",
  payment_due: "Payment due",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export function tourStageClass(stage: TourStage) {
  const map: Record<TourStage, string> = {
    upcoming: "bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
    confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    in_progress: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    completed: "bg-muted text-muted-foreground border-border",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    no_show: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[stage];
}

export function paymentStateClass(state: PaymentState) {
  const map: Record<PaymentState, string> = {
    unpaid: "bg-muted text-muted-foreground border-border",
    deposit_paid: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    partially_paid: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-300",
    fully_paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300",
    payment_due: "bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-300",
    refunded: "bg-muted text-muted-foreground border-border",
    partially_refunded: "bg-muted text-muted-foreground border-border",
  };
  return map[state];
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function deriveStage(b: LedgerBooking): TourStage {
  const raw = (b.tour_status || "").toLowerCase();
  if (raw && raw !== "upcoming") {
    if (["confirmed", "in_progress", "completed", "cancelled", "no_show"].includes(raw))
      return raw as TourStage;
  }
  const s = (b.status || "").toLowerCase();
  if (s === "cancelled") return "cancelled";
  if (s === "done" || s === "archived") return "completed";
  if (s === "confirmed") return "confirmed";
  return "upcoming";
}

/** Money received and status for one booking, from confirmed payments only. */
export function buildLedger(
  b: LedgerBooking,
  orders: PaidRow[],
  manual: ManualRow[],
): BookingLedger {
  const totalCents =
    b.amount_total != null && Number(b.amount_total) > 0
      ? Number(b.amount_total)
      : b.total_estimate != null
        ? Math.round(Number(b.total_estimate) * 100)
        : 0;

  const onlinePaid = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((n, o) => n + Number(o.amount_total || 0), 0);

  // Rows linked to an order are already counted above — only manual entries add.
  const manualPaid = manual
    .filter((m) => !m.order_id && m.direction === "payment")
    .reduce((n, m) => n + Number(m.amount_cents || 0), 0);

  const manualRefund = manual
    .filter((m) => m.direction === "refund")
    .reduce((n, m) => n + Number(m.amount_cents || 0), 0);

  const refundCents = Math.max(Number(b.refund_cents || 0), manualRefund);
  const paidCents = Math.max(0, onlinePaid + manualPaid - refundCents);
  const dueCents = Math.max(0, totalCents - paidCents);

  const stage = deriveStage(b);

  let paymentState: PaymentState;
  if (refundCents > 0 && paidCents <= 0) paymentState = "refunded";
  else if (refundCents > 0) paymentState = "partially_refunded";
  else if (totalCents > 0 && dueCents <= 0) paymentState = "fully_paid";
  else if (paidCents > 0) paymentState = stage === "completed" ? "payment_due" : "deposit_paid";
  else paymentState = stage === "completed" ? "payment_due" : "unpaid";

  const settled = dueCents <= 0 || refundCents > 0 || totalCents <= 0;

  let section: BookingSection;
  const today = todayKey();
  if (stage === "cancelled") section = "cancelled";
  else if (stage === "completed" || stage === "no_show")
    section = settled ? "history" : "completed_due";
  else if (b.travel_date && b.travel_date === today) section = "today";
  else if (b.travel_date && b.travel_date > today) section = "upcoming";
  else section = settled ? "history" : "payment_due";

  return { totalCents, paidCents, refundCents, dueCents, tourStage: stage, paymentState, section };
}

export function euro(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}
