import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";
import { buildLedger } from "./booking-ledger";

const tokenSchema = z.string().regex(/^[a-f0-9]{32,64}$/);

function lisbonDay(offset = 0) {
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(d);
}

async function guideByToken(admin: any, token: string) {
  const { data } = await admin
    .from("ops_staff")
    .select("id, name, status")
    .eq("dispatch_token", token)
    .maybeSingle();
  if (!data || String(data.status).toLowerCase() === "inactive") return null;
  return data as { id: string; name: string; status: string };
}

async function ledgerFor(admin: any, ids: string[], bookings: any[]) {
  if (!ids.length) return new Map<string, ReturnType<typeof buildLedger>>();
  const [pay, ord] = await Promise.all([
    admin.from("booking_payments").select("booking_id, amount_cents, direction, order_id").in("booking_id", ids),
    admin.from("orders").select("booking_id, amount_total, payment_status").in("booking_id", ids),
  ]);
  const m = new Map<string, ReturnType<typeof buildLedger>>();
  for (const b of bookings) {
    m.set(
      b.id,
      buildLedger(
        b,
        (ord.data ?? []).filter((o: any) => o.booking_id === b.id),
        (pay.data ?? []).filter((p: any) => p.booking_id === b.id),
      ),
    );
  }
  return m;
}

/** Public (secret link): a guide's tours for today and tomorrow. */
export const getGuideRunSheet = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const guide = await guideByToken(supabaseAdmin, data.token);
    if (!guide) return null;
    const today = lisbonDay(0);
    const tomorrow = lisbonDay(1);
    const { data: rows } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_reference, customer_name, phone, tour_title, travel_date, travel_time, guests, status, tour_status, payment_status, amount_total, total_estimate, refund_cents, option_duration_label, pickup_type, pickup_place_name, pickup_address, pickup_instructions, pickup_latitude, pickup_longitude, meetup_point_name, meetup_point_address, meetup_point_instructions, notes",
      )
      .eq("guide_id", guide.id)
      .in("travel_date", [today, tomorrow])
      .order("travel_date")
      .order("travel_time");
    const list = (rows ?? []).filter((b: any) => String(b.status).toLowerCase() !== "cancelled");
    const led = await ledgerFor(supabaseAdmin, list.map((b: any) => b.id), list);
    return {
      guide: { name: String(guide.name).split(" ")[0] },
      today,
      tomorrow,
      tours: list.map((b: any) => {
        const l = led.get(b.id)!;
        return {
          id: b.id,
          ref: b.booking_reference,
          guest: b.customer_name,
          phone: b.phone,
          tour: b.tour_title,
          date: b.travel_date,
          time: b.travel_time,
          guests: b.guests,
          duration: b.option_duration_label,
          place: b.pickup_place_name || b.meetup_point_name || null,
          address: b.pickup_address || b.meetup_point_address || null,
          instructions: b.pickup_instructions || b.meetup_point_instructions || null,
          lat: b.pickup_latitude,
          lng: b.pickup_longitude,
          notes: b.notes ?? null,
          stage: l.tourStage,
          due_cents: l.dueCents,
          total_cents: l.totalCents,
        };
      }),
    };
  });

/** Public (secret link): guide starts or finishes one of their own tours. */
export const guideTourAction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({ token: tokenSchema, bookingId: z.string().uuid(), action: z.enum(["start", "finish"]) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const guide = await guideByToken(supabaseAdmin, data.token);
    if (!guide) throw new Error("This link is no longer active");
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id, guide_id, booking_reference, status, tour_status, amount_total, total_estimate, refund_cents, payment_status")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!b || b.guide_id !== guide.id) throw new Error("Tour not found");
    const { logEvent } = await import("./bookings-admin.server");

    if (data.action === "start") {
      if (b.tour_status === "completed") return { ok: true };
      await supabaseAdmin.from("bookings").update({ tour_status: "in_progress" }).eq("id", b.id);
      await logEvent(supabaseAdmin, b.id, "status", `Tour started by ${guide.name}`, {} as any, null);
      return { ok: true };
    }

    if (b.tour_status === "completed") return { ok: true, collected_cents: 0 };
    // Amount owed is always worked out here, never taken from the phone.
    const led = (await ledgerFor(supabaseAdmin, [b.id], [b])).get(b.id)!;
    const due = led.dueCents;
    if (due > 0) {
      const { data: settings } = await supabaseAdmin
        .from("site_settings")
        .select("commission_rate_percent")
        .eq("id", true)
        .maybeSingle();
      const rate = Number(settings?.commission_rate_percent ?? 20);
      const { error } = await supabaseAdmin.from("booking_payments").insert({
        booking_id: b.id,
        amount_cents: due,
        direction: "payment",
        method: "guide_cash",
        collected_by: guide.name,
        settlement_kind: "balance",
        notes: "Recorded by guide from run-sheet",
        paid_at: new Date().toISOString(),
        guide_id: guide.id,
        commission_rate_percent: rate,
        commission_cents: Math.round((due * rate) / 100),
      });
      if (error) throw new Error("Could not record the cash");
      const { syncBookingSettlement } = await import("./settlement.server");
      await syncBookingSettlement(supabaseAdmin, b.id);
    }
    await supabaseAdmin.from("bookings").update({ tour_status: "completed" }).eq("id", b.id);
    const summary = due > 0
      ? `Tour finished by ${guide.name} — €${(due / 100).toFixed(2)} cash collected`
      : `Tour finished by ${guide.name}`;
    await logEvent(supabaseAdmin, b.id, due > 0 ? "payment" : "status", summary, {} as any, null);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: null,
      entity: "booking",
      entity_id: b.id,
      action: "guide_finish",
      summary,
    } as any);
    if (due > 0) {
      try {
        const { sendAdminPush } = await import("./push.server");
        await sendAdminPush(supabaseAdmin as never, {
          title: `Cash collected · €${(due / 100).toFixed(2)}`,
          body: `${b.booking_reference ?? ""} — by ${guide.name}`,
          url: "/admin/reconciliation",
          tag: `guide-cash-${b.id}`,
        });
      } catch {
        /* alert only */
      }
    }
    return { ok: true, collected_cents: due };
  });

/** Admin: list guides with their private run-sheet tokens. */
export const listGuideLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context as any, "ops.manage");
    const { data, error } = await context.supabase
      .from("ops_staff")
      .select("id, name, role, status, whatsapp, phone, dispatch_token")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Admin: issue a fresh run-sheet link (old one stops working). */
export const resetGuideLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ staffId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context as any, "ops.manage");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("ops_staff").update({ dispatch_token: token }).eq("id", data.staffId);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({
      actor: context.userId,
      action: "guide_link_reset",
      entity: "ops_staff",
      entity_id: data.staffId,
      summary: "Guide run-sheet link reset",
    } as any);
    return { token };
  });
