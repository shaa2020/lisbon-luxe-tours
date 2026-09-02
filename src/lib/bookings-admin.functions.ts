import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

const overridesSchema = z
  .object({
    subject: z.string().max(300).nullable().optional(),
    heading: z.string().max(300).nullable().optional(),
    intro: z.string().max(5000).nullable().optional(),
    outro: z.string().max(5000).nullable().optional(),
    ctaLabel: z.string().max(120).nullable().optional(),
    ctaUrl: z.string().max(500).nullable().optional(),
    includeDetails: z.boolean().nullable().optional(),
    extra: z.record(z.string(), z.string()).nullable().optional(),
  })
  .default({});

const createSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().trim().max(40).nullable().optional(),
  tour_slug: z.string().trim().max(120).nullable().optional(),
  tour_title: z.string().trim().max(200).nullable().optional(),
  travel_date: z.string().trim().max(20).nullable().optional(),
  travel_time: z.string().trim().max(20).nullable().optional(),
  guests: z.number().int().min(1).max(40),
  total_estimate: z.number().int().min(0).max(100000).nullable().optional(),
  amount_total: z.number().int().min(0).max(10000000).nullable().optional(),
  status: z.string().trim().max(30).default("confirmed"),
  payment_status: z.string().trim().max(30).default("unpaid"),
  source: z.enum(["website", "whatsapp", "phone", "walk_in", "partner", "email"]).default("whatsapp"),
  notes: z.string().max(4000).nullable().optional(),
  internal_notes: z.string().max(4000).nullable().optional(),
  sendConfirmation: z.boolean().default(false),
  /** Ask the customer to pay this % (20–100) online right away. */
  depositPercent: z.number().int().min(20).max(100).nullable().optional(),
  sendPaymentRequest: z.boolean().default(false),
});

export const adminCreateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { sendConfirmation, depositPercent, sendPaymentRequest, ...row } = data;

    const totalCents =
      row.amount_total ?? (row.total_estimate != null ? row.total_estimate * 100 : null);
    const wantsDeposit =
      sendPaymentRequest && depositPercent != null && totalCents != null && totalCents > 0;
    const requestCents = wantsDeposit
      ? Math.max(1, Math.round((totalCents * depositPercent) / 100))
      : null;

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        ...row,
        travel_date: row.travel_date || null,
        travel_time: row.travel_time || null,
        payment_status: requestCents ? "request" : row.payment_status,
        payment_request_cents: requestCents,
      })
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      booking.id,
      "created",
      `Booking created manually (${row.source})`,
      null,
      context.userId,
    );

    if (requestCents) {
      await logEvent(
        supabaseAdmin,
        booking.id,
        "payment_request",
        `Deposit request of €${(requestCents / 100).toFixed(2)} (${depositPercent}%) emailed`,
        { request_cents: requestCents, percent: depositPercent },
        context.userId,
      );
      await sendBookingEmail(supabaseAdmin, booking as any, "payment_request", {}, context.userId);
    } else if (sendConfirmation) {
      await sendBookingEmail(supabaseAdmin, booking as any, "booking_confirmation", {}, context.userId);
    }
    return booking;
  });

const requestPaymentSchema = z.object({
  id: z.string().uuid(),
  percent: z.number().int().min(20).max(100),
});

/**
 * Sets the amount the customer is asked to pay now (percent of the total) and
 * emails them the branded payment request with a secure pay button.
 */
export const adminRequestPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => requestPaymentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeBookingBalance } = await import("./balance-pay.server");

    const balance = await computeBookingBalance(supabaseAdmin, data.id);
    if (!balance) throw new Error("Booking not found");
    if (balance.cancelled) throw new Error("This booking has been cancelled");
    if (balance.dueCents <= 0) throw new Error("This booking is already fully paid");
    if (balance.totalCents <= 0) throw new Error("Set a total for this booking first");

    const requestCents = Math.min(
      Math.max(1, Math.round((balance.totalCents * data.percent) / 100)),
      balance.dueCents,
    );

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_request_cents: requestCents, payment_status: "request" })
      .eq("id", data.id)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      data.id,
      "payment_request",
      `Payment request of €${(requestCents / 100).toFixed(2)} (${data.percent}%) emailed`,
      { request_cents: requestCents, percent: data.percent },
      context.userId,
    );

    const result = await sendBookingEmail(
      supabaseAdmin,
      booking as any,
      "payment_request",
      {},
      context.userId,
    );
    return { requestCents, ...result };
  });

const updateSchema = z.object({
  id: z.string().uuid(),
  patch: z.object({
    customer_name: z.string().trim().min(2).max(120).optional(),
    email: z.string().email().max(200).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    tour_title: z.string().trim().max(200).nullable().optional(),
    travel_date: z.string().trim().max(20).nullable().optional(),
    travel_time: z.string().trim().max(20).nullable().optional(),
    guests: z.number().int().min(1).max(40).optional(),
    total_estimate: z.number().int().min(0).max(100000).nullable().optional(),
    amount_total: z.number().int().min(0).max(10000000).nullable().optional(),
    status: z.string().trim().max(30).optional(),
    payment_status: z.string().trim().max(30).optional(),
    source: z.string().trim().max(30).optional(),
    notes: z.string().max(4000).nullable().optional(),
    internal_notes: z.string().max(4000).nullable().optional(),
    auto_emails_opt_out: z.boolean().optional(),
  }),
  notify: z.boolean().default(false),
});

export const adminUpdateBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: before } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (!before) throw new Error("Booking not found");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update(data.patch)
      .eq("id", data.id)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    const changed = Object.keys(data.patch).filter(
      (k) => (before as any)[k] !== (booking as any)[k],
    );
    await logEvent(
      supabaseAdmin,
      booking.id,
      "updated",
      changed.length ? `Updated ${changed.join(", ")}` : "Booking saved",
      { before: Object.fromEntries(changed.map((k) => [k, (before as any)[k]])), after: Object.fromEntries(changed.map((k) => [k, (booking as any)[k]])) },
      context.userId,
    );

    if (data.notify) {
      await sendBookingEmail(supabaseAdmin, booking as any, "booking_updated", {}, context.userId);
    }
    return booking;
  });

const cancelSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().max(1000).nullable().optional(),
  refundCents: z.number().int().min(0).max(10000000).default(0),
  notify: z.boolean().default(true),
});

export const adminCancelBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cancelSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertPermission(context, "bookings.delete");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "cancelled",
        cancel_reason: data.reason || null,
        refund_cents: data.refundCents,
        payment_status: data.refundCents > 0 ? "refunded" : undefined,
      })
      .eq("id", data.id)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      booking.id,
      "cancelled",
      data.refundCents > 0
        ? `Cancelled with a €${(data.refundCents / 100).toFixed(2)} refund`
        : "Cancelled with no refund",
      { reason: data.reason ?? null },
      context.userId,
    );

    if (data.notify) {
      await sendBookingEmail(
        supabaseAdmin,
        booking as any,
        data.refundCents > 0 ? "refund_issued" : "booking_cancelled",
        {},
        context.userId,
      );
    }
    return booking;
  });

const refundSchema = z.object({
  id: z.string().uuid(),
  refundCents: z.number().int().min(1).max(10000000),
  notify: z.boolean().default(true),
  note: z.string().max(1000).nullable().optional(),
});

export const adminRecordRefund = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => refundSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertPermission(context, "orders.refund");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({ refund_cents: data.refundCents, payment_status: "refunded" })
      .eq("id", data.id)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      booking.id,
      "refund",
      `Refund of €${(data.refundCents / 100).toFixed(2)} recorded`,
      { note: data.note ?? null },
      context.userId,
    );

    if (data.notify) {
      await sendBookingEmail(supabaseAdmin, booking as any, "refund_issued", {}, context.userId);
    }
    return booking;
  });

const sendSchema = z.object({
  bookingId: z.string().uuid(),
  templateKey: z.string().trim().min(2).max(60),
  overrides: overridesSchema,
});

export const adminPreviewBookingEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, resolveBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");
    const r = await resolveBookingEmail(supabaseAdmin, booking as any, data.templateKey, data.overrides);
    return {
      subject: r.subject,
      heading: r.heading,
      intro: r.intro,
      outro: r.outro,
      ctaLabel: r.ctaLabel,
      ctaUrl: r.ctaUrl,
      rows: r.rows,
      recipient: booking.email as string,
    };
  });

export const adminSendBookingEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sendSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking) throw new Error("Booking not found");
    return sendBookingEmail(supabaseAdmin, booking as any, data.templateKey, data.overrides, context.userId);
  });

export const adminBookingTimeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("./bookings-admin.server");
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: events } = await supabaseAdmin
      .from("booking_events")
      .select("id,kind,summary,detail,created_at")
      .eq("booking_id", data.bookingId)
      .order("created_at", { ascending: false })
      .limit(100);
    return events ?? [];
  });
