import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";

/**
 * Manually recorded money: cash taken at the office, cash paid straight to the
 * guide, bank transfers. These rows live in the same ledger the online
 * payments use, so a booking's paid / still-owed figures stay correct.
 */

export const PAYMENT_METHODS = [
  { value: "cash", label: "Paid by cash", hint: "Customer paid cash — the company received it" },
  { value: "guide", label: "Paid to guide", hint: "Customer paid the guide directly" },
  { value: "bank", label: "Bank transfer", hint: "Money arrived in the company account" },
  { value: "other", label: "Other", hint: "Anything else" },
] as const;

const recordSchema = z.object({
  booking_id: z.string().uuid(),
  amount_cents: z.number().int().min(1).max(100000000),
  method: z.enum(["cash", "guide", "bank", "other"]),
  direction: z.enum(["payment", "refund"]).default("payment"),
  guide_id: z.string().uuid().nullable().optional(),
  reference: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  paid_at: z.string().max(40).nullable().optional(),
});

export const adminRecordBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => recordSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
    const commissionCents = Math.round((data.amount_cents * rate) / 100);

    const guideId = data.guide_id ?? booking.guide_id ?? null;

    const { data: row, error } = await supabaseAdmin
      .from("booking_payments")
      .insert({
        booking_id: data.booking_id,
        amount_cents: data.amount_cents,
        direction: data.direction,
        method: data.method,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
        paid_at: data.paid_at || new Date().toISOString(),
        created_by: context.userId,
        guide_id: guideId,
        commission_rate_percent: rate,
        commission_cents: commissionCents,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const label = PAYMENT_METHODS.find((m) => m.value === data.method)?.label ?? data.method;
    const summary = `${data.direction === "refund" ? "Refund" : "Payment"} of €${(
      data.amount_cents / 100
    ).toFixed(2)} recorded (${label})`;

    await logEvent(supabaseAdmin, data.booking_id, "payment", summary, data as any, context.userId);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "booking_payments",
      entity_id: row.id,
      action: data.direction,
      summary,
      after_value: data as any,
    });

    return { ok: true, id: row.id };
  });

export const adminDeleteBookingPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("booking_payments")
      .select("id,booking_id,amount_cents,order_id,method")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) throw new Error("Payment not found");
    if (row.order_id) throw new Error("This payment came from the payment provider and can't be deleted");

    const { error } = await supabaseAdmin.from("booking_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("admin_audit_log").insert({
      actor: context.userId,
      entity: "booking_payments",
      entity_id: data.id,
      action: "delete",
      summary: `Removed recorded payment of €${(Number(row.amount_cents) / 100).toFixed(2)}`,
      before_value: row as any,
    });

    return { ok: true };
  });

const assignSchema = z.object({
  booking_id: z.string().uuid(),
  guide_id: z.string().uuid().nullable().optional(),
  vehicle_id: z.string().uuid().nullable().optional(),
  tour_status: z
    .enum(["upcoming", "confirmed", "in_progress", "completed", "cancelled", "no_show"])
    .nullable()
    .optional(),
});

/** Assign a guide / vehicle and move the tour along its stages. */
export const adminAssignBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => assignSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logEvent } = await import("./bookings-admin.server");

    const patch: Record<string, unknown> = {};
    if (data.guide_id !== undefined) patch["guide_id"] = data.guide_id;
    if (data.vehicle_id !== undefined) patch["vehicle_id"] = data.vehicle_id;
    if (data.tour_status) patch["tour_status"] = data.tour_status;
    if (Object.keys(patch).length === 0) return { ok: true, conflicts: [] as string[] };

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("id,travel_date,travel_time,guide_id,vehicle_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");

    // Warn (never block) when the same guide or vehicle is already booked that day.
    const conflicts: string[] = [];
    if (booking.travel_date && (data.guide_id || data.vehicle_id)) {
      const { data: sameDay } = await supabaseAdmin
        .from("bookings")
        .select("id,booking_reference,travel_time,guide_id,vehicle_id,status")
        .eq("travel_date", booking.travel_date)
        .neq("id", data.booking_id);
      for (const other of sameDay ?? []) {
        if ((other.status || "").toLowerCase() === "cancelled") continue;
        if (data.guide_id && other.guide_id === data.guide_id)
          conflicts.push(
            `Guide already on ${other.booking_reference ?? "another booking"}${other.travel_time ? ` at ${other.travel_time}` : ""}`,
          );
        if (data.vehicle_id && other.vehicle_id === data.vehicle_id)
          conflicts.push(
            `Vehicle already on ${other.booking_reference ?? "another booking"}${other.travel_time ? ` at ${other.travel_time}` : ""}`,
          );
      }
    }

    const { error } = await supabaseAdmin.from("bookings").update(patch).eq("id", data.booking_id);
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      data.booking_id,
      "assignment",
      Object.keys(patch)
        .map((k) => k.replace("_", " "))
        .join(", ") + " updated",
      patch,
      context.userId,
    );

    return { ok: true, conflicts };
  });
