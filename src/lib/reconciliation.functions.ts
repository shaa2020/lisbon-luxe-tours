import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission, assertRole } from "./roles";
import {
  computeSettlement,
  settlementStatus,
  type SettlementStatus,
} from "./settlement.server";

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

/** A manually recorded settlement (cash, card to guide, bank transfer…). */
export type ReconSettlement = {
  id: string;
  amountCents: number;
  direction: string;
  method: string;
  collectedBy: string | null;
  guideId: string | null;
  notes: string | null;
  paidAt: string;
  linkedToOrder: boolean;
};

export type ReconIssue =
  | "booking_marked_paid_without_payment"
  | "payment_collected_but_booking_unpaid"
  | "amount_mismatch"
  | "refund_exceeds_collected"
  | "payment_stuck_pending"
  | "orphan_payment"
  | "failed_attempt_only"
  | "overpaid";

/** One booking with every payment attached and the money maths done. */
export type ReconBooking = {
  bookingId: string;
  bookingReference: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  tourTitle: string | null;
  travelDate: string | null;
  createdAt: string;
  status: string | null;
  paymentStatus: string | null;
  source: string | null;
  guideId: string | null;
  totalCents: number;
  /** Money confirmed by an online provider (deposit and/or balance). */
  onlineCents: number;
  /** Money collected in person: cash, card to guide, bank transfer, other. */
  manualCents: number;
  collectedCents: number;
  pendingCents: number;
  failedCents: number;
  refundCents: number;
  netCents: number;
  outstandingCents: number;
  overpaidCents: number;
  requestedCents: number;
  isDeposit: boolean;
  settlement: SettlementStatus;
  payments: ReconPayment[];
  settlements: ReconSettlement[];
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
    onlineCents: number;
    manualCents: number;
    refundedCents: number;
    netCents: number;
    outstandingCents: number;
    pendingCents: number;
    failedCents: number;
    depositsOpenCents: number;
    fullySettled: number;
    partiallyPaid: number;
    pendingBalance: number;
    discrepancies: number;
  };
  byProvider: { provider: string; collectedCents: number; count: number }[];
  bookings: ReconBooking[];
  orphans: ReconOrphan[];
};

const PAID_STATES = new Set(["paid", "partially_refunded"]);
const PENDING_STATES = new Set(["pending", "created", "open", "request", "authorized"]);
const FAILED_STATES = new Set(["failed", "declined", "cancelled", "canceled", "expired"]);

/**
 * Full money reconciliation: every booking against every recorded payment
 * attempt plus every manual settlement, with deposits, refunds, outstanding
 * balances and mismatches.
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

    const [
      { data: bookingRows, error: bErr },
      { data: orderRows, error: oErr },
      { data: manualRows, error: mErr },
    ] = await Promise.all([
      supabaseAdmin
        .from("bookings")
        .select(
          "id,booking_reference,customer_name,email,phone,tour_title,travel_date,created_at,status,payment_status,source,guide_id,amount_total,total_estimate,refund_cents,payment_request_cents",
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
      supabaseAdmin
        .from("booking_payments")
        .select(
          "id,booking_id,amount_cents,direction,method,collected_by,guide_id,notes,paid_at,order_id",
        )
        .order("paid_at", { ascending: false })
        .limit(5000),
    ]);
    if (bErr) throw new Error(bErr.message);
    if (oErr) throw new Error(oErr.message);
    if (mErr) throw new Error(mErr.message);

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

    const manualByBooking = new Map<string, ReconSettlement[]>();
    for (const m of manualRows ?? []) {
      const row: ReconSettlement = {
        id: m.id as string,
        amountCents: Number(m.amount_cents || 0),
        direction: String(m.direction || "payment"),
        method: String(m.method || "other"),
        collectedBy: (m.collected_by as string) || null,
        guideId: (m.guide_id as string) || null,
        notes: (m.notes as string) || null,
        paidAt: m.paid_at as string,
        linkedToOrder: Boolean(m.order_id),
      };
      const list = manualByBooking.get(m.booking_id as string) ?? [];
      list.push(row);
      manualByBooking.set(m.booking_id as string, list);

      if (!row.linkedToOrder && row.direction === "payment") {
        const agg = providerTotals.get(row.method) ?? { collectedCents: 0, count: 0 };
        agg.collectedCents += row.amountCents;
        agg.count += 1;
        providerTotals.set(row.method, agg);
      }
    }

    const dayAgo = Date.now() - 86400000;
    const bookings: ReconBooking[] = [];

    for (const b of bookingRows ?? []) {
      const payments = (ordersByBooking.get(b.id as string) ?? []).sort((a, z) =>
        z.createdAt.localeCompare(a.createdAt),
      );
      const settlements = manualByBooking.get(b.id as string) ?? [];

      const totals = computeSettlement(
        b as any,
        payments.map((p) => ({ amount_total: p.amountCents, payment_status: p.status })),
        settlements.map((s) => ({
          amount_cents: s.amountCents,
          direction: s.direction,
          order_id: s.linkedToOrder ? "linked" : null,
        })),
      );

      const pendingCents = payments
        .filter((p) => PENDING_STATES.has(p.status))
        .reduce((s, p) => s + p.amountCents, 0);
      const failedCents = payments
        .filter((p) => FAILED_STATES.has(p.status))
        .reduce((s, p) => s + p.amountCents, 0);
      const requestedCents = Number(b.payment_request_cents || 0);
      const cancelled = b.status === "cancelled";

      const issues: ReconIssue[] = [];
      const markedPaid = b.payment_status === "paid" || b.payment_status === "deposit_paid";

      if (markedPaid && totals.paidCents <= 0) issues.push("booking_marked_paid_without_payment");
      if (!markedPaid && totals.paidCents > 0 && !cancelled)
        issues.push("payment_collected_but_booking_unpaid");
      if (b.payment_status === "paid" && totals.remainingCents > 0) issues.push("amount_mismatch");
      if (totals.refundCents > totals.onlineCents + totals.manualCents)
        issues.push("refund_exceeds_collected");
      if (totals.overpaidCents > 0) issues.push("overpaid");
      if (payments.some((p) => PENDING_STATES.has(p.status) && new Date(p.createdAt).getTime() < dayAgo))
        issues.push("payment_stuck_pending");
      if (
        totals.paidCents === 0 &&
        payments.length > 0 &&
        payments.every((p) => FAILED_STATES.has(p.status))
      )
        issues.push("failed_attempt_only");

      bookings.push({
        bookingId: b.id as string,
        bookingReference: (b.booking_reference as string) || null,
        customerName: (b.customer_name as string) || null,
        email: (b.email as string) || null,
        phone: (b.phone as string) || null,
        tourTitle: (b.tour_title as string) || null,
        travelDate: (b.travel_date as string) || null,
        createdAt: b.created_at as string,
        status: (b.status as string) || null,
        paymentStatus: (b.payment_status as string) || null,
        source: (b.source as string) || null,
        guideId: (b.guide_id as string) || null,
        totalCents: totals.totalCents,
        onlineCents: totals.onlineCents,
        manualCents: totals.manualCents,
        collectedCents: totals.paidCents,
        pendingCents,
        failedCents,
        refundCents: totals.refundCents,
        netCents: totals.paidCents,
        outstandingCents: totals.remainingCents,
        overpaidCents: totals.overpaidCents,
        requestedCents,
        isDeposit: totals.paidCents > 0 && totals.remainingCents > 0,
        settlement: settlementStatus(totals, {
          cancelled,
          markedPaid,
          hasDiscrepancy: issues.length > 0,
        }),
        payments,
        settlements,
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
        acc.onlineCents += b.onlineCents;
        acc.manualCents += b.manualCents;
        acc.refundedCents += b.refundCents;
        acc.pendingCents += b.pendingCents;
        acc.failedCents += b.failedCents;
        if (b.settlement === "fully_settled") acc.fullySettled += 1;
        else if (b.settlement === "partially_paid") acc.partiallyPaid += 1;
        else if (b.settlement === "pending_balance") acc.pendingBalance += 1;
        else acc.discrepancies += 1;
        return acc;
      },
      {
        bookings: 0,
        bookedValueCents: 0,
        collectedCents: 0,
        onlineCents: 0,
        manualCents: 0,
        refundedCents: 0,
        netCents: 0,
        outstandingCents: 0,
        pendingCents: 0,
        failedCents: 0,
        depositsOpenCents: 0,
        fullySettled: 0,
        partiallyPaid: 0,
        pendingBalance: 0,
        discrepancies: 0,
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
      const { syncBookingSettlement } = await import("./settlement.server");
      await syncBookingSettlement(supabaseAdmin, order.booking_id);
    }

    return {
      provider: remote.provider,
      previousStatus: order.payment_status,
      providerStatus: remoteStatus,
      changed,
    };
  });

/* ------------------------------------------------------------------ *
 * Balance settlement: recording, editing and undoing money collected
 * outside the online checkout (cash or card to the guide, bank, other).
 * ------------------------------------------------------------------ */

export const SETTLEMENT_METHODS = [
  { value: "guide_cash", label: "Cash to guide", hint: "Customer paid the guide in cash" },
  { value: "guide_card", label: "Card to guide", hint: "Customer paid the guide by card" },
  { value: "cash", label: "Cash to company", hint: "Cash received by the company" },
  { value: "online", label: "Online payment", hint: "Paid through a payment link" },
  { value: "bank", label: "Bank transfer", hint: "Money arrived in the company account" },
  { value: "other", label: "Other", hint: "Anything else" },
] as const;

export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number]["value"];

const methodEnum = z.enum(["guide_cash", "guide_card", "cash", "online", "bank", "other"]);

const settleSchema = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().min(1).max(100000000),
  method: methodEnum,
  collected_by: z.string().max(160).nullable().optional(),
  guide_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_at: z.string().max(40).nullable().optional(),
});

function methodLabel(v: string) {
  return SETTLEMENT_METHODS.find((m) => m.value === v)?.label ?? v;
}

/** Records money collected against a booking and re-settles its status. */
export const adminSettleBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncBookingSettlement } = await import("./settlement.server");
    const { logEvent } = await import("./bookings-admin.server");

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id,guide_id,booking_reference")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!booking) throw new Error("Booking not found");

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("commission_rate_percent")
      .eq("id", true)
      .maybeSingle();
    const rate = Number(settings?.commission_rate_percent ?? 20);

    const guideId = data.guide_id ?? booking.guide_id ?? null;

    const { data: row, error } = await supabaseAdmin
      .from("booking_payments")
      .insert({
        booking_id: data.booking_id,
        amount_cents: data.amount_cents,
        direction: "payment",
        method: data.method,
        collected_by: data.collected_by ?? null,
        settlement_kind: "balance",
        notes: data.notes ?? null,
        paid_at: data.paid_at || new Date().toISOString(),
        created_by: context.userId,
        guide_id: guideId,
        commission_rate_percent: rate,
        commission_cents: Math.round((data.amount_cents * rate) / 100),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const totals = await syncBookingSettlement(supabaseAdmin, data.booking_id);
    const summary = `Balance settlement of €${(data.amount_cents / 100).toFixed(2)} (${methodLabel(
      data.method,
    )})${data.collected_by ? ` collected by ${data.collected_by}` : ""}`;

    await logEvent(supabaseAdmin, data.booking_id, "payment", summary, data as any, context.userId);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "booking_payments",
      entity_id: row.id,
      action: "settle",
      summary,
      after_value: data as any,
    });

    return { ok: true, id: row.id, totals };
  });

const editSchema = z.object({
  id: z.string().uuid(),
  amount_cents: z.number().int().min(1).max(100000000).optional(),
  method: methodEnum.optional(),
  collected_by: z.string().max(160).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_at: z.string().max(40).nullable().optional(),
});

/** Edits a recorded settlement, keeping a before/after audit trail. */
export const adminEditSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => editSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncBookingSettlement } = await import("./settlement.server");

    const { data: before } = await supabaseAdmin
      .from("booking_payments")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Settlement not found");
    if (before.order_id)
      throw new Error("This payment came from the payment provider and can't be edited here");

    const patch: {
      amount_cents?: number;
      method?: string;
      collected_by?: string | null;
      notes?: string | null;
      paid_at?: string;
      commission_cents?: number;
    } = {};
    if (data.amount_cents !== undefined) {
      patch.amount_cents = data.amount_cents;
      const rate = Number(before.commission_rate_percent ?? 20);
      patch.commission_cents = Math.round((data.amount_cents * rate) / 100);
    }
    if (data.method !== undefined) patch.method = data.method;
    if (data.collected_by !== undefined) patch.collected_by = data.collected_by ?? null;
    if (data.notes !== undefined) patch.notes = data.notes ?? null;
    if (data.paid_at) patch.paid_at = data.paid_at;

    if (Object.keys(patch).length === 0) return { ok: true };

    const { error } = await supabaseAdmin.from("booking_payments").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    const totals = await syncBookingSettlement(supabaseAdmin, before.booking_id as string);

    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "booking_payments",
      entity_id: data.id,
      action: "edit",
      summary: `Settlement edited (${methodLabel(String(patch.method ?? before.method))})`,
      before_value: before as any,
      after_value: patch as any,
    });

    return { ok: true, totals };
  });

/** Undoes a recorded settlement; the booking's status is recalculated. */
export const adminUndoSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { syncBookingSettlement } = await import("./settlement.server");
    const { logEvent } = await import("./bookings-admin.server");

    const { data: before } = await supabaseAdmin
      .from("booking_payments")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Settlement not found");
    if (before.order_id)
      throw new Error("This payment came from the payment provider and can't be undone here");

    const { error } = await supabaseAdmin.from("booking_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const bookingId = before.booking_id as string;
    const totals = await syncBookingSettlement(supabaseAdmin, bookingId);
    const summary = `Settlement of €${(Number(before.amount_cents) / 100).toFixed(2)} undone${
      data.reason ? ` — ${data.reason}` : ""
    }`;

    await logEvent(supabaseAdmin, bookingId, "payment", summary, before as any, context.userId);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "booking_payments",
      entity_id: data.id,
      action: "undo",
      summary,
      before_value: before as any,
    });

    return { ok: true, totals };
  });

/** Audit trail for one booking's money: who recorded or changed what, and when. */
export const adminSettlementHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ids } = await supabaseAdmin
      .from("booking_payments")
      .select("id")
      .eq("booking_id", data.bookingId);

    const paymentIds = (ids ?? []).map((r) => r.id as string);

    const { data: rows } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id,actor_email,action,summary,created_at,entity_id")
      .eq("entity", "booking_payments")
      .in("entity_id", paymentIds.length ? paymentIds : ["00000000-0000-0000-0000-000000000000"])
      .order("created_at", { ascending: false })
      .limit(100);

    return (rows ?? []).map((r) => ({
      id: r.id as string,
      actor: (r.actor_email as string) || "Admin",
      action: String(r.action),
      summary: String(r.summary || ""),
      at: r.created_at as string,
    }));
  });
