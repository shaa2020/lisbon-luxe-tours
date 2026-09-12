import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

const idInput = z.object({ id: z.string().uuid() });
const checkoutInput = idInput.extend({
  percent: z.union([z.literal(20), z.literal(50), z.literal(70), z.literal(100)]).optional(),
});

/** Public, safe balance summary for the customer pay page (UUID acts as the key). */
export const getBookingBalance = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeBookingBalance } = await import("./balance-pay.server");
    const { paymentsStatus } = await import("./payments.server");

    const balance = await computeBookingBalance(supabaseAdmin, data.id);
    if (!balance) throw new Error("Booking not found");

    const payments = await paymentsStatus(supabaseAdmin);
    return {
      ...balance,
      paymentsAvailable: payments.available,
      paymentsMessage: payments.available ? null : payments.message,
    };
  });

/**
 * Creates a checkout for the outstanding balance and returns the provider's
 * redirect URL. Amount is always computed server-side from the orders ledger.
 */
export const createBalanceCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeBookingBalance } = await import("./balance-pay.server");
    const { paymentsStatus, createPayment } = await import("./payments.server");

    const balance = await computeBookingBalance(supabaseAdmin, data.id);
    if (!balance) throw new Error("Booking not found");
    if (balance.cancelled) throw new Error("This booking has been cancelled.");
    if (balance.dueCents <= 0) throw new Error("This booking is already fully paid.");
    const chargeCents = data.percent
      ? data.percent === 100
        ? balance.dueCents
        : Math.min(balance.dueCents, Math.max(1, Math.round((balance.totalCents * data.percent) / 100)))
      : balance.requestCents;
    if (chargeCents <= 0) throw new Error("There is no payment due right now.");
    const isDeposit = chargeCents < balance.dueCents;

    const payments = await paymentsStatus(supabaseAdmin);
    if (!payments.available) throw new Error(payments.message);

    const { data: booking } = await supabaseAdmin
      .from("bookings")
      .select("customer_name,email,tour_title,tour_slug,guests,travel_date")
      .eq("id", data.id)
      .single();
    if (!booking) throw new Error("Booking not found");

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const payment = await createPayment(supabaseAdmin, {
      amountCents: chargeCents,
      description: `${booking.tour_title || "Tuk Tuk 24 tour"} — ${isDeposit ? "deposit payment" : "balance payment"}`,
      origin,
      metadata: {
        booking_id: data.id,
        kind: isDeposit ? "deposit" : "balance",
        selected_percent: String(data.percent ?? "requested"),
      },
    });

    await supabaseAdmin.from("orders").insert({
      booking_id: data.id,
      stripe_session_id: payment.id,
      provider: payment.provider,
      amount_total: chargeCents,
      currency: "eur",
      payment_status: "pending",
      customer_name: booking.customer_name,
      customer_email: booking.email,
      tour_title: booking.tour_title,
      tour_slug: booking.tour_slug,
      guests: booking.guests,
      travel_date: booking.travel_date || null,
    });

    return { url: payment.checkoutUrl, sessionId: payment.id };
  });
