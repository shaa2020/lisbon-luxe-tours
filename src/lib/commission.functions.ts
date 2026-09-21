import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";

/**
 * Commission centre (owner only).
 *
 * The company keeps a commission percentage of every euro that is actually
 * received; the rest belongs to the guide. Money that the guide collected
 * directly (cash handed to the guide) never reached the company account, so
 * the guide owes the company its commission on it. Money that arrived in the
 * company account (online payments, cash handed to the office) means the
 * company owes the guide their share. Settlements clear either direction.
 */

export type CommissionPayment = {
  id: string;
  bookingId: string;
  reference: string | null;
  customer: string | null;
  tour: string | null;
  travelDate: string | null;
  paidAt: string;
  method: string;
  amountCents: number;
  ratePercent: number;
  commissionCents: number;
  guideShareCents: number;
  /** true when the guide took the money directly (company never received it). */
  collectedByGuide: boolean;
  guideId: string | null;
  guideName: string;
};

const GUIDE_METHODS = new Set(["guide", "paid_to_guide"]);

function round(n: number) {
  return Math.round(n);
}

const overviewSchema = z.object({
  from: z.string().trim().max(20).nullable().optional(),
  to: z.string().trim().max(20).nullable().optional(),
  guideId: z.string().uuid().nullable().optional(),
});

export const getCommissionOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => overviewSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: settings }, { data: staff }] = await Promise.all([
      supabaseAdmin
        .from("site_settings")
        .select("commission_rate_percent")
        .eq("id", true)
        .maybeSingle(),
      supabaseAdmin.from("ops_staff").select("id,name,role").order("name"),
    ]);

    const currentRate = Number(settings?.commission_rate_percent ?? 20);

    // Rate history: a payment keeps the rate that was in force when it arrived.
    const { data: rateHistory } = await supabaseAdmin
      .from("commission_rate_history")
      .select("percent,effective_from")
      .order("effective_from", { ascending: true });

    const history = (rateHistory ?? []).map((r: any) => ({
      percent: Number(r.percent),
      from: String(r.effective_from),
    }));

    const rateAt = (when: string | null | undefined) => {
      if (!history.length) return currentRate;
      const at = when || new Date().toISOString();
      let rate = history[0].percent;
      for (const h of history) {
        if (h.from <= at) rate = h.percent;
        else break;
      }
      return rate;
    };
    const guideName = new Map<string, string>(
      (staff ?? []).map((s: any) => [s.id as string, s.name as string]),
    );

    // Bookings carry the guide the money belongs to.
    const { data: bookings } = await supabaseAdmin
      .from("bookings")
      .select(
        "id,booking_reference,customer_name,tour_title,travel_date,guide_id,refund_cents,amount_total,total_estimate",
      );
    const byBooking = new Map<string, any>((bookings ?? []).map((b: any) => [b.id, b]));

    const [{ data: orders }, { data: manual }] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id,booking_id,amount_total,payment_status,created_at,provider")
        .eq("payment_status", "paid"),
      supabaseAdmin
        .from("booking_payments")
        .select(
          "id,booking_id,amount_cents,direction,method,order_id,paid_at,guide_id,commission_rate_percent,commission_cents,notes",
        ),
    ]);

    const rows: CommissionPayment[] = [];

    const push = (opts: {
      id: string;
      bookingId: string;
      paidAt: string;
      method: string;
      amountCents: number;
      ratePercent: number;
      collectedByGuide: boolean;
      guideId: string | null;
    }) => {
      const b = byBooking.get(opts.bookingId);
      const commission = round((opts.amountCents * opts.ratePercent) / 100);
      rows.push({
        id: opts.id,
        bookingId: opts.bookingId,
        reference: b?.booking_reference ?? null,
        customer: b?.customer_name ?? null,
        tour: b?.tour_title ?? null,
        travelDate: b?.travel_date ?? null,
        paidAt: opts.paidAt,
        method: opts.method,
        amountCents: opts.amountCents,
        ratePercent: opts.ratePercent,
        commissionCents: commission,
        guideShareCents: opts.amountCents - commission,
        collectedByGuide: opts.collectedByGuide,
        guideId: opts.guideId,
        guideName: opts.guideId ? (guideName.get(opts.guideId) ?? "Unknown guide") : "Unassigned",
      });
    };

    for (const o of orders ?? []) {
      if (!o.booking_id) continue;
      const b = byBooking.get(o.booking_id);
      push({
        id: `order:${o.id}`,
        bookingId: o.booking_id,
        paidAt: o.created_at,
        method: o.provider || "online",
        amountCents: Number(o.amount_total || 0),
        ratePercent: rateAt(o.created_at),
        collectedByGuide: false,
        guideId: b?.guide_id ?? null,
      });
    }

    for (const m of manual ?? []) {
      if (m.order_id) continue; // already counted through the order above
      if (m.direction !== "payment") continue;
      const b = byBooking.get(m.booking_id);
      push({
        id: `manual:${m.id}`,
        bookingId: m.booking_id,
        paidAt: m.paid_at,
        method: m.method || "manual",
        amountCents: Number(m.amount_cents || 0),
        ratePercent:
          m.commission_rate_percent != null ? Number(m.commission_rate_percent) : rateAt(m.paid_at),
        collectedByGuide: GUIDE_METHODS.has(String(m.method || "")),
        guideId: (m.guide_id as string | null) ?? b?.guide_id ?? null,
      });
    }

    // Refunds recorded manually reduce what was received.
    for (const m of manual ?? []) {
      if (m.direction !== "refund") continue;
      const b = byBooking.get(m.booking_id);
      push({
        id: `refund:${m.id}`,
        bookingId: m.booking_id,
        paidAt: m.paid_at,
        method: `refund (${m.method || "manual"})`,
        amountCents: -Number(m.amount_cents || 0),
        ratePercent:
          m.commission_rate_percent != null ? Number(m.commission_rate_percent) : currentRate,
        collectedByGuide: GUIDE_METHODS.has(String(m.method || "")),
        guideId: (m.guide_id as string | null) ?? b?.guide_id ?? null,
      });
    }

    const from = data.from || null;
    const to = data.to || null;
    const filtered = rows.filter((r) => {
      const day = (r.paidAt || "").slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (data.guideId && r.guideId !== data.guideId) return false;
      return true;
    });

    const { data: settlements } = await supabaseAdmin
      .from("guide_settlements")
      .select("id,guide_id,direction,amount_cents,note,settled_at")
      .order("settled_at", { ascending: false });

    const settlementRows = (settlements ?? []).map((s: any) => ({
      id: s.id as string,
      guideId: s.guide_id as string,
      guideName: guideName.get(s.guide_id) ?? "Unknown guide",
      direction: s.direction as string,
      amountCents: Number(s.amount_cents || 0),
      note: (s.note as string | null) ?? null,
      settledAt: s.settled_at as string,
    }));

    type GuideBucket = {
      guideId: string | null;
      guideName: string;
      receivedByCompanyCents: number;
      receivedByGuideCents: number;
      commissionCents: number;
      guideShareCents: number;
      /** guide still to hand over commission on money they collected */
      guideOwesCompanyCents: number;
      /** company still to pay the guide their share of money it received */
      companyOwesGuideCents: number;
      netCents: number;
      payments: CommissionPayment[];
    };

    const buckets = new Map<string, GuideBucket>();
    const keyOf = (id: string | null) => id ?? "unassigned";

    for (const r of filtered) {
      const k = keyOf(r.guideId);
      let bucket = buckets.get(k);
      if (!bucket) {
        bucket = {
          guideId: r.guideId,
          guideName: r.guideName,
          receivedByCompanyCents: 0,
          receivedByGuideCents: 0,
          commissionCents: 0,
          guideShareCents: 0,
          guideOwesCompanyCents: 0,
          companyOwesGuideCents: 0,
          netCents: 0,
          payments: [],
        };
        buckets.set(k, bucket);
      }
      bucket.payments.push(r);
      bucket.commissionCents += r.commissionCents;
      bucket.guideShareCents += r.guideShareCents;
      if (r.collectedByGuide) {
        bucket.receivedByGuideCents += r.amountCents;
        bucket.guideOwesCompanyCents += r.commissionCents;
      } else {
        bucket.receivedByCompanyCents += r.amountCents;
        bucket.companyOwesGuideCents += r.guideShareCents;
      }
    }

    for (const s of settlementRows) {
      const k = keyOf(s.guideId);
      const bucket = buckets.get(k);
      if (!bucket) continue;
      if (data.guideId && s.guideId !== data.guideId) continue;
      if (s.direction === "payout") bucket.companyOwesGuideCents -= s.amountCents;
      else bucket.guideOwesCompanyCents -= s.amountCents;
    }

    const guides = [...buckets.values()]
      .map((b) => ({
        ...b,
        netCents: b.companyOwesGuideCents - b.guideOwesCompanyCents,
        payments: b.payments.sort((a, c) => (a.paidAt < c.paidAt ? 1 : -1)),
      }))
      .sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents));

    const totals = {
      receivedCents: filtered.reduce((n, r) => n + r.amountCents, 0),
      receivedByCompanyCents: guides.reduce((n, g) => n + g.receivedByCompanyCents, 0),
      receivedByGuideCents: guides.reduce((n, g) => n + g.receivedByGuideCents, 0),
      commissionCents: filtered.reduce((n, r) => n + r.commissionCents, 0),
      guideShareCents: filtered.reduce((n, r) => n + r.guideShareCents, 0),
      guideOwesCompanyCents: guides.reduce((n, g) => n + Math.max(0, g.guideOwesCompanyCents), 0),
      companyOwesGuideCents: guides.reduce((n, g) => n + Math.max(0, g.companyOwesGuideCents), 0),
    };

    return {
      ratePercent: currentRate,
      totals,
      guides,
      settlements: settlementRows,
      staff: (staff ?? []).map((s: any) => ({ id: s.id as string, name: s.name as string })),
    };
  });

export const setCommissionRate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ percent: z.number().min(0).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("site_settings")
      .select("commission_rate_percent")
      .eq("id", true)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("site_settings")
      .update({ commission_rate_percent: data.percent })
      .eq("id", true);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "site_settings",
      action: "commission_rate",
      summary: `Commission rate set to ${data.percent}%`,
      before_value: { commission_rate_percent: before?.commission_rate_percent ?? null },
      after_value: { commission_rate_percent: data.percent },
    });

    return { ok: true, percent: data.percent };
  });

const settlementSchema = z.object({
  guide_id: z.string().uuid(),
  direction: z.enum(["payout", "received"]),
  amount_cents: z.number().int().min(1).max(100000000),
  note: z.string().max(500).nullable().optional(),
  settled_at: z.string().max(40).nullable().optional(),
});

export const recordGuideSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settlementSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("guide_settlements")
      .insert({
        guide_id: data.guide_id,
        direction: data.direction,
        amount_cents: data.amount_cents,
        note: data.note ?? null,
        settled_at: data.settled_at || new Date().toISOString(),
        actor: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "guide_settlements",
      entity_id: row.id,
      action: "settle",
      summary:
        data.direction === "payout"
          ? `Paid guide €${(data.amount_cents / 100).toFixed(2)}`
          : `Received €${(data.amount_cents / 100).toFixed(2)} from guide`,
      after_value: data as any,
    });

    return { ok: true, id: row.id };
  });

export const deleteGuideSettlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "owner");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("guide_settlements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
