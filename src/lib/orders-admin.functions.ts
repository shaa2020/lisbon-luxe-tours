import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

export type AdminOrderBooking = {
  id: string;
  status: string | null;
  payment_status: string | null;
  travel_date: string | null;
  travel_time: string | null;
  guests: number | null;
  tour_title: string | null;
  phone: string | null;
  refund_cents: number;
  totalCents: number;
  paidCents: number;
  dueCents: number;
};

export type AdminOrder = {
  id: string;
  booking_id: string | null;
  provider: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  currency: string;
  payment_status: string;
  customer_name: string | null;
  customer_email: string | null;
  tour_title: string | null;
  tour_slug: string | null;
  guests: number | null;
  travel_date: string | null;
  created_at: string;
  /** "tour" for the fare, "tip" for a gratuity paid to the guide. */
  kind?: string | null;
  booking: AdminOrderBooking | null;
};

/** Orders ledger with the linked booking's balance, for the admin Orders page. */
export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOrder[]> => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id,booking_id,provider,stripe_session_id,stripe_payment_intent_id,amount_total,currency,payment_status,customer_name,customer_email,tour_title,tour_slug,guests,travel_date,created_at,kind",
      )
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);

    const bookingIds = Array.from(
      new Set((orders ?? []).map((o) => o.booking_id).filter(Boolean) as string[]),
    );

    const bookings = new Map<string, AdminOrderBooking>();
    if (bookingIds.length) {
      const { data: rows } = await supabaseAdmin
        .from("bookings")
        .select(
          "id,status,payment_status,travel_date,travel_time,guests,tour_title,phone,refund_cents,amount_total,total_estimate",
        )
        .in("id", bookingIds);

      // Paid orders per booking = how much has actually been collected.
      // Partially refunded orders were still collected, so they keep counting.
      const paidByBooking = new Map<string, number>();
      for (const o of orders ?? []) {
        if (!o.booking_id) continue;
        if (o.payment_status !== "paid" && o.payment_status !== "partially_refunded") continue;
        paidByBooking.set(
          o.booking_id,
          (paidByBooking.get(o.booking_id) ?? 0) + Number(o.amount_total || 0),
        );
      }

      for (const b of rows ?? []) {
        const totalCents =
          b.amount_total != null
            ? Number(b.amount_total)
            : b.total_estimate != null
              ? Math.round(Number(b.total_estimate) * 100)
              : 0;
        const paidCents = paidByBooking.get(b.id) ?? 0;
        bookings.set(b.id, {
          id: b.id,
          status: b.status ?? null,
          payment_status: b.payment_status ?? null,
          travel_date: b.travel_date ?? null,
          travel_time: b.travel_time ?? null,
          guests: b.guests ?? null,
          tour_title: b.tour_title ?? null,
          phone: b.phone ?? null,
          refund_cents: Number(b.refund_cents || 0),
          totalCents,
          paidCents,
          dueCents: Math.max(0, totalCents - paidCents),
        });
      }
    }

    return (orders ?? []).map((o) => ({
      ...(o as any),
      provider: (o as any).provider || "manual",
      booking: o.booking_id ? (bookings.get(o.booking_id) ?? null) : null,
    })) as AdminOrder[];
  });

const orderIdSchema = z.object({ orderId: z.string().uuid() });

async function loadOrder(admin: any, orderId: string) {
  const { data, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order not found");
  return data;
}

/** Emails the branded invoice (with the secure PDF link) from the business mailbox. */
export const adminEmailOrderInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");

    const order = await loadOrder(supabaseAdmin, data.orderId);
    if (!order.booking_id)
      throw new Error("This payment is not linked to a booking, so no invoice email can be sent.");

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select(BOOKING_SELECT)
      .eq("id", order.booking_id)
      .maybeSingle();
    if (!booking) throw new Error("Linked booking not found");

    return sendBookingEmail(supabaseAdmin, booking as any, "invoice", {}, context.userId);
  });

/** Asks the customer for what is still due on the linked booking. */
export const adminRequestOrderBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderIdSchema.extend({ percent: z.number().int().min(20).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");
    const { computeBookingBalance } = await import("./balance-pay.server");

    const order = await loadOrder(supabaseAdmin, data.orderId);
    if (!order.booking_id) throw new Error("This payment is not linked to a booking.");

    const balance = await computeBookingBalance(supabaseAdmin, order.booking_id);
    if (!balance) throw new Error("Linked booking not found");
    if (balance.cancelled) throw new Error("This booking has been cancelled");
    if (balance.dueCents <= 0) throw new Error("This booking is already fully paid");

    const requestCents = Math.min(
      Math.max(1, Math.round((balance.totalCents * data.percent) / 100)),
      balance.dueCents,
    );

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .update({ payment_request_cents: requestCents, payment_status: "request" })
      .eq("id", order.booking_id)
      .select(BOOKING_SELECT)
      .single();
    if (error) throw new Error(error.message);

    await logEvent(
      supabaseAdmin,
      order.booking_id,
      "payment_request",
      `Payment request of €${(requestCents / 100).toFixed(2)} (${data.percent}%) emailed`,
      { request_cents: requestCents, percent: data.percent, from: "orders" },
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

/** Records a full or partial refund against an order and its booking. */
export const adminRefundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    orderIdSchema
      .extend({
        refundCents: z.number().int().min(1).max(10000000),
        notify: z.boolean().default(true),
        note: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.refund");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logEvent, sendBookingEmail, BOOKING_SELECT } = await import("./bookings-admin.server");

    const order = await loadOrder(supabaseAdmin, data.orderId);
    if (data.refundCents > Number(order.amount_total || 0))
      throw new Error("Refund cannot exceed the amount paid on this order");

    const orderAmount = Number(order.amount_total || 0);
    const isFullOrderRefund = data.refundCents >= orderAmount;

    const { error: orderErr } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: isFullOrderRefund ? "refunded" : "partially_refunded" })
      .eq("id", data.orderId);
    if (orderErr) throw new Error(orderErr.message);

    if (order.booking_id) {
      const { data: current } = await supabaseAdmin
        .from("bookings")
        .select("refund_cents,amount_total,total_estimate")
        .eq("id", order.booking_id)
        .maybeSingle();
      const total = Number(current?.refund_cents || 0) + data.refundCents;
      const bookingTotal =
        current?.amount_total != null
          ? Number(current.amount_total)
          : current?.total_estimate != null
            ? Math.round(Number(current.total_estimate) * 100)
            : orderAmount;

      const { data: booking, error } = await supabaseAdmin
        .from("bookings")
        .update({
          refund_cents: total,
          payment_status: total >= bookingTotal && bookingTotal > 0 ? "refunded" : "partially_refunded",
        })
        .eq("id", order.booking_id)
        .select(BOOKING_SELECT)
        .single();
      if (error) throw new Error(error.message);

      await logEvent(
        supabaseAdmin,
        order.booking_id,
        "refund",
        `Refund of €${(data.refundCents / 100).toFixed(2)} recorded from Orders`,
        { note: data.note ?? null, order_id: data.orderId },
        context.userId,
      );

      if (data.notify) {
        await sendBookingEmail(supabaseAdmin, booking as any, "refund_issued", {}, context.userId);
      }
    }

    return { ok: true, refundCents: data.refundCents, notified: data.notify && !!order.booking_id };
  });

/** Explicit status change with an audit note on the linked booking. */
export const adminSetOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    orderIdSchema
      .extend({
        status: z.enum([
          "paid",
          "pending",
          "failed",
          "partially_refunded",
          "refunded",
          "rescheduled",
        ]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logEvent } = await import("./bookings-admin.server");

    const order = await loadOrder(supabaseAdmin, data.orderId);
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.status })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);

    if (order.booking_id) {
      await logEvent(
        supabaseAdmin,
        order.booking_id,
        "payment",
        `Payment marked as ${data.status}`,
        { order_id: data.orderId, from: order.payment_status, to: data.status },
        context.userId,
      );
    }
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => orderIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "orders.refund");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
