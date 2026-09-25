import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

const tipInput = z.object({
  /** Private guest link token — acts as the key for this booking. */
  token: z.string().trim().min(10).max(120),
  amount_cents: z.number().int().min(100).max(100000),
});

/** Public summary used by the post-tour tipping card on the guest page. */
export const getTipContext = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ token: z.string().trim().min(10).max(120) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paymentsStatus } = await import("./payments.server");

    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id,guide_id,tip_cents,status")
      .eq("guest_token", data.token)
      .maybeSingle();
    if (!b) throw new Error("Tour not found");

    let guideName: string | null = null;
    if (b.guide_id) {
      const { data: g } = await supabaseAdmin
        .from("ops_staff")
        .select("name")
        .eq("id", b.guide_id)
        .maybeSingle();
      guideName = (g?.name as string) || null;
    }

    const payments = await paymentsStatus(supabaseAdmin);
    return {
      guideName,
      tippedCents: Number(b.tip_cents || 0),
      cancelled: b.status === "cancelled",
      paymentsAvailable: payments.available,
    };
  });

/**
 * Starts a standalone gratuity payment for a booking. The amount never touches
 * the tour fare: it is stored as its own ledger row and only counts once the
 * provider confirms the money arrived.
 */
export const createTipPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tipInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { paymentsStatus, createPayment } = await import("./payments.server");

    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select("id,customer_name,email,tour_title,tour_slug,guests,travel_date,status")
      .eq("guest_token", data.token)
      .maybeSingle();
    if (!b) throw new Error("Tour not found");
    if (b.status === "cancelled") throw new Error("This booking has been cancelled.");

    const payments = await paymentsStatus(supabaseAdmin);
    if (!payments.available) throw new Error(payments.message);

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const payment = await createPayment(supabaseAdmin, {
      amountCents: data.amount_cents,
      description: "Tip for your Tuk Tuk 24 guide",
      origin,
      redirectPath: "/tip/thanks",
      lineItems: [
        { priceId: "guide_tip", name: "Tip for your guide", unitAmountCents: data.amount_cents, quantity: 1 },
      ],
      metadata: { booking_id: b.id as string, kind: "tip", guest_token: data.token },
    });

    await supabaseAdmin.from("orders").insert({
      booking_id: b.id,
      stripe_session_id: payment.id,
      provider: payment.provider,
      amount_total: data.amount_cents,
      kind: "tip",
      currency: "eur",
      payment_status: "pending",
      customer_name: b.customer_name,
      customer_email: b.email,
      tour_title: b.tour_title,
      tour_slug: b.tour_slug,
      guests: b.guests,
      travel_date: b.travel_date || null,
    });

    return { url: payment.checkoutUrl as string | null, sessionId: payment.id as string };
  });

/** Re-checks a tip payment with the provider and records it only when paid. */
export const confirmTip = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ session_id: z.string().min(5).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getPaymentByReference } = await import("./payments.server");
    const { recordTipsForSession } = await import("./tips.server");

    const payment = await getPaymentByReference(data.session_id);
    const paid = payment.status === "paid";

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: paid ? "paid" : payment.status || "pending",
        stripe_payment_intent_id: payment.id,
      })
      .eq("stripe_session_id", data.session_id)
      .eq("kind", "tip");

    const recorded = paid ? await recordTipsForSession(supabaseAdmin, data.session_id) : 0;
    return { paid, amountCents: recorded || payment.amountCents || 0, status: payment.status };
  });
