import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

/** A payment attempt as recorded in the orders ledger. */
export type ReconPayment = {
  id: string;
  provider: string;
  reference: string | null;
  intentId: string | null;
  amountCents: number;
  status: string;
  createdAt: string;
};

export type ReconIssue =
  | "booking_marked_paid_without_payment"
  | "payment_collected_but_booking_unpaid"
  | "amount_mismatch"
  | "refund_exceeds_collected"
  | "payment_stuck_pending"
  | "orphan_payment"
  | "failed_attempt_only";

/** One booking with every payment attempt attached and the money maths done. */
export type ReconBooking = {
  bookingId: string;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  tourTitle: string | null;
  travelDate: string | null;
  createdAt: string;
  status: string | null;
  paymentStatus: string | null;
  source: string | null;
  totalCents: number;
  collectedCents: number;
  pendingCents: number;
  failedCents: number;
  refundCents: number;
  netCents: number;
  outstandingCents: number;
  requestedCents: number;
  isDeposit: boolean;
  payments: ReconPayment[];
  issues: ReconIssue[];
};

export type ReconOrphan = ReconPayment & {
  customerName: string | null;
  email: string | null;
  tourTitle: string | null;
};

export type ReconReport = {
  generatedAt: string;
  totals: {
    bookings: number;
    bookedValueCents: number;
    collectedCents: number;
    refundedCents: number;
    netCents: number;
    outstandingCents: number;
    pendingCents: number;
    failedCents: number;
    depositsOpenCents: number;
  };
  byProvider: { provider: string; collectedCents: number; count: number }[];
  bookings: ReconBooking[];
  orphans: ReconOrphan[];
};

const PAID_STATES = new Set(["paid", "partially_refunded"]);
const PENDING_STATES = new Set(["pending", "created", "open", "request", "authorized"]);
const FAILED_STATES = new Set(["failed", "declined", "cancelled", "canceled", "expired"]);

function bookingTotal(b: { amount_total: number | null; total_estimate: number | null }) {
  if (b.amount_total != null) return Number(b.amount_total);
  if (b.total_estimate != null) return Math.round(Number(b.total_estimate) * 100);
  return 0;
}

/**
 * Full money reconciliation: every booking against every recorded payment
 * attempt, with deposits, refunds, outstanding balances and mismatches.
 */
export const adminReconciliation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(0).max(3650).default(365) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<ReconReport> => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since =
      data.days > 0
        ? new Date(Date.now() - data.days * 86400000).toISOString()
        : new Date(0).toISOString();

    const [{ data: bookingRows, error: bErr }, { data: orderRows, error: oErr }] =
      await Promise.all([
        supabaseAdmin
          .from("bookings")
          .select(
            "id,customer_name,email,phone,tour_title,travel_date,created_at,status,payment_status,source,amount_total,total_estimate,refund_cents,payment_request_cents",
          )
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabaseAdmin
          .from("orders")
          .select(
            "id,booking_id,provider,stripe_session_id,stripe_payment_intent_id,amount_total,payment_status,customer_name,customer_email,tour_title,created_at",
          )
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(4000),
      ]);
    if (bErr) throw new Error(bErr.message);
    if (oErr) throw new Error(oErr.message);

    const ordersByBooking = new Map<string, ReconPayment[]>();
    const orphans: ReconOrphan[] = [];
    const providerTotals = new Map<string, { collectedCents: number; count: number }>();

    for (const o of orderRows ?? []) {
      const payment: ReconPayment = {
        id: o.id as string,
        provider: (o.provider as string) || "manual",
        reference: (o.stripe_session_id as string) || null,
        intentId: (o.stripe_payment_intent_id as string) || null,
        amountCents: Number(o.amount_total || 0),
        status: String(o.payment_status || "pending"),
        createdAt: o.created_at as string,
      };

      if (PAID_STATES.has(payment.status) || payment.status === "refunded") {
        const agg = providerTotals.get(payment.provider) ?? { collectedCents: 0, count: 0 };
        if (PAID_STATES.has(payment.status)) agg.collectedCents += payment.amountCents;
        agg.count += 1;
        providerTotals.set(payment.provider, agg);
      }

      if (o.booking_id) {
        const list = ordersByBooking.get(o.booking_id as string) ?? [];
        list.push(payment);
        ordersByBooking.set(o.booking_id as string, list);
      } else {
        orphans.push({
          ...payment,
          customerName: (o.customer_name as string) || null,
          email: (o.customer_email as string) || null,
          tourTitle: (o.tour_title as string) || null,
        });
      }
    }

    const dayAgo = Date.now() - 86400000;
    const bookings: ReconBooking[] = [];

    for (const b of bookingRows ?? []) {
      const payments = (ordersByBooking.get(b.id as string) ?? []).sort((a, z) =>
        z.createdAt.localeCompare(a.createdAt),
      );
      const totalCents = bookingTotal(b as any);
      const collectedCents = payments
        .filter((p) => PAID_STATES.has(p.status))
        .reduce((s, p) => s + p.amountCents, 0);
      const pendingCents = payments
        .filter((p) => PENDING_STATES.has(p.status))
        .reduce((s, p) => s + p.amountCents, 0);
      const failedCents = payments
        .filter((p) => FAILED_STATES.has(p.status))
        .reduce((s, p) => s + p.amountCents, 0);
      const refundCents = Number(b.refund_cents || 0);
      const netCents = collectedCents - refundCents;
      const outstandingCents = Math.max(0, totalCents - collectedCents);
      const requestedCents = Number(b.payment_request_cents || 0);
      const cancelled = b.status === "cancelled";

      const issues: ReconIssue[] = [];
      const markedPaid = b.payment_status === "paid" || b.payment_status === "deposit_paid";

      if (markedPaid && collectedCents <= 0) issues.push("booking_marked_paid_without_payment");
      if (!markedPaid && collectedCents > 0 && !cancelled)
        issues.push("payment_collected_but_booking_unpaid");
      if (b.payment_status === "paid" && outstandingCents > 0) issues.push("amount_mismatch");
      if (refundCents > collectedCents) issues.push("refund_exceeds_collected");
      if (
        payments.some(
          (p) => PENDING_STATES.has(p.status) && new Date(p.createdAt).getTime() < dayAgo,
        )
      )
        issues.push("payment_stuck_pending");
      if (collectedCents === 0 && payments.length > 0 && payments.every((p) => FAILED_STATES.has(p.status)))
        issues.push("failed_attempt_only");

      bookings.push({
        bookingId: b.id as string,
        customerName: (b.customer_name as string) || null,
        email: (b.email as string) || null,
        phone: (b.phone as string) || null,
        tourTitle: (b.tour_title as string) || null,
        travelDate: (b.travel_date as string) || null,
        createdAt: b.created_at as string,
        status: (b.status as string) || null,
        paymentStatus: (b.payment_status as string) || null,
        source: (b.source as string) || null,
        totalCents,
        collectedCents,
        pendingCents,
        failedCents,
        refundCents,
        netCents,
        outstandingCents,
        requestedCents,
        isDeposit: collectedCents > 0 && outstandingCents > 0,
        payments,
        issues,
      });
    }

    const totals = bookings.reduce(
      (acc, b) => {
        acc.bookings += 1;
        if (b.status !== "cancelled") {
          acc.bookedValueCents += b.totalCents;
          acc.outstandingCents += b.outstandingCents;
          if (b.isDeposit) acc.depositsOpenCents += b.outstandingCents;
        }
        acc.collectedCents += b.collectedCents;
        acc.refundedCents += b.refundCents;
        acc.pendingCents += b.pendingCents;
        acc.failedCents += b.failedCents;
        return acc;
      },
      {
        bookings: 0,
        bookedValueCents: 0,
        collectedCents: 0,
        refundedCents: 0,
        netCents: 0,
        outstandingCents: 0,
        pendingCents: 0,
        failedCents: 0,
        depositsOpenCents: 0,
      },
    );
    totals.netCents = totals.collectedCents - totals.refundedCents;

    return {
      generatedAt: new Date().toISOString(),
      totals,
      byProvider: Array.from(providerTotals.entries())
        .map(([provider, v]) => ({ provider, ...v }))
        .sort((a, b) => b.collectedCents - a.collectedCents),
      bookings,
      orphans,
    };
  });

/**
 * Re-checks one recorded payment against the provider (PayPal/Mollie/Stripe)
 * and writes back the provider's answer. Money is only ever trusted from the
 * provider, never from the customer's browser.
 */
export const adminVerifyPaymentWithProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPaymentByReference } = await import("./payments.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,booking_id,stripe_session_id,payment_status,amount_total")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Payment record not found");
    if (!order.stripe_session_id)
      throw new Error("This payment has no provider reference to check (manual entry).");

    const remote = await getPaymentByReference(order.stripe_session_id);
    const remoteStatus = remote.status === "paid" ? "paid" : remote.status || "pending";
    const changed = remoteStatus !== order.payment_status;

    if (changed) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: remoteStatus, stripe_payment_intent_id: remote.id })
        .eq("id", order.id);
    }

    if (order.booking_id) {
      const { syncBookingPaymentStatus } = await import("./balance-pay.server");
      await syncBookingPaymentStatus(supabaseAdmin, order.booking_id);
    }

    return {
      provider: remote.provider,
      previousStatus: order.payment_status,
      providerStatus: remoteStatus,
      changed,
    };
  });
