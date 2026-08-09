import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { applyModificationToBooking } from "./booking-changes.server";
import { createPayment, getPaymentByReference, paymentsStatus } from "./payments.server";

const checkoutInput = z.object({
  tour_slug: z.string().max(120),
  tour_title: z.string().min(1).max(200),
  customer_name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  travel_date: z.string().max(20).optional().nullable(),
  time: z.string().max(20).optional().nullable(),
  guests: z.number().int().min(1).max(20),
  notes: z.string().max(2000).optional().nullable(),
  amount: z.number().int().min(100).max(500000), // cents, €1–€5000
  image_url: z.string().url().optional().nullable(),
  /** Share of the total charged now. 20–100 (%). Defaults to full payment. */
  deposit_pct: z.number().int().min(20).max(100).optional().nullable(),
});


export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertSlotAvailable, buildTourLineItems, tourBaseCents } = await import("./catalog.server");
    const payments = await paymentsStatus(supabaseAdmin);

    // Hold the slot: refuse if it filled up while the customer was deciding.
    await assertSlotAvailable(supabaseAdmin, data.travel_date, data.time);

    // Deposit: charge a share now (min 20%), rest is due on the day.
    const depositPct = Math.min(100, Math.max(20, data.deposit_pct ?? 100));
    const chargeCents = depositPct >= 100 ? data.amount : Math.round((data.amount * depositPct) / 100);
    const balanceCents = data.amount - chargeCents;
    const depositNote =
      balanceCents > 0
        ? `Deposit ${depositPct}% — €${(chargeCents / 100).toFixed(2)} paid online, €${(balanceCents / 100).toFixed(2)} balance due on the day.`
        : null;

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_slug: data.tour_slug,
        tour_title: data.tour_title,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone ?? null,
        travel_date: data.travel_date || null,
        travel_time: data.time || null,
        guests: data.guests,
        notes: [data.time ? `Preferred time: ${data.time}` : null, depositNote, data.notes]
          .filter(Boolean)
          .join("\n\n") || null,
        total_estimate: Math.round(data.amount / 100),
        amount_total: data.amount,
        status: "new",
        payment_status: payments.available ? "pending" : "request",
      })

      .select("id")
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking insert failed");

    if (!payments.available) {
      return {
        mode: "maintenance" as const,
        message: payments.message,
        booking_id: booking.id as string,
        url: null,
      };
    }

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("hotel_pickup_fee_cents")
      .eq("id", true)
      .maybeSingle();
    const baseCents = await tourBaseCents(supabaseAdmin, data.tour_slug);
    const lineItems =
      balanceCents > 0
        ? [
            {
              priceId: "tour_deposit",
              name: `${data.tour_title} — ${depositPct}% deposit`,
              unitAmountCents: chargeCents,
              quantity: 1,
            },
          ]
        : buildTourLineItems({
            tourSlug: data.tour_slug,
            tourTitle: data.tour_title,
            guests: data.guests,
            totalCents: data.amount,
            baseCents,
            pickupFeeCents: settings?.hotel_pickup_fee_cents ?? 0,
            pickupRequested: /hotel pickup/i.test(data.notes || ""),
          });

    const payment = await createPayment(supabaseAdmin, {
      amountCents: chargeCents,
      description: `${data.tour_title} · ${data.guests} guest${data.guests === 1 ? "" : "s"}${data.travel_date ? ` · ${data.travel_date}` : ""}${balanceCents > 0 ? ` · ${depositPct}% deposit` : ""}`,
      origin,
      lineItems,
      metadata: {
        booking_id: booking.id,
        tour_slug: data.tour_slug,
        guests: String(data.guests),
        deposit_pct: String(depositPct),
        balance_cents: String(balanceCents),
      },
    });


    await supabaseAdmin.from("orders").insert({
      booking_id: booking.id,
      stripe_session_id: payment.id,
      provider: payment.provider,
      amount_total: chargeCents,

      currency: "eur",
      payment_status: "pending",
      customer_name: data.customer_name,
      customer_email: data.email,
      tour_title: data.tour_title,
      tour_slug: data.tour_slug,
      guests: data.guests,
      travel_date: data.travel_date || null,
    });

    return {
      mode: "pay" as const,
      message: null,
      url: payment.checkoutUrl as string | null,
      booking_id: booking.id as string,
      sessionId: payment.id as string,
    };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ session_id: z.string().min(5).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payment = await getPaymentByReference(data.session_id);
    const paid = payment.status === "paid";
    const newStatus = paid ? "paid" : payment.status || "pending";

    const { data: order } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: newStatus,
        stripe_payment_intent_id: payment.id,
      })
      .eq("stripe_session_id", data.session_id)
      .select("booking_id, tour_title, amount_total, customer_name, travel_date, guests")
      .maybeSingle();

    if (order?.booking_id && paid) {
      const { data: bk } = await supabaseAdmin
        .from("bookings")
        .select("amount_total")
        .eq("id", order.booking_id)
        .maybeSingle();
      const isDeposit = !!bk?.amount_total && (order.amount_total ?? 0) < bk.amount_total;
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: isDeposit ? "deposit_paid" : "paid", status: "confirmed" })
        .eq("id", order.booking_id);


      const { data: mod } = await supabaseAdmin
        .from("booking_modifications")
        .select("id")
        .eq("stripe_session_id", data.session_id)
        .maybeSingle();
      if (mod) {
        await applyModificationToBooking(supabaseAdmin, mod.id);
      }
    }

    // Modification-only payments don't have an orders row.
    if (!order && paid) {
      const { data: mod } = await supabaseAdmin
        .from("booking_modifications")
        .select("id, booking_id")
        .eq("stripe_session_id", data.session_id)
        .maybeSingle();
      if (mod) {
        await supabaseAdmin
          .from("booking_modifications")
          .update({ payment_status: "paid", status: "approved" })
          .eq("id", mod.id);
        await applyModificationToBooking(supabaseAdmin, mod.id);
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("tour_title, amount_total, customer_name")
          .eq("id", mod.booking_id)
          .maybeSingle();
        return {
          paid: true,
          status: "paid",
          booking_id: mod.booking_id as string | null,
          tour_title: booking?.tour_title || null,
          amount_total: booking?.amount_total || 0,
          customer_name: booking?.customer_name || null,
          travel_date: null as string | null,
          guests: null as number | null,
        };
      }
    }

    return {
      paid,
      status: newStatus,
      booking_id: order?.booking_id || null,
      tour_title: order?.tour_title || null,
      amount_total: order?.amount_total || 0,
      customer_name: order?.customer_name || null,
      travel_date: order?.travel_date || null,
      guests: order?.guests || null,
    };
  });
