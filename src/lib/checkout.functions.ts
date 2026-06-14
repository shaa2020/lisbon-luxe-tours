import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

function getStripeKey(): string {
  const key =
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_LIVE_API_KEY ||
    process.env.STRIPE_SANDBOX_API_KEY ||
    "";
  if (!key) throw new Error("Stripe key not configured");
  return key;
}

function getLovableKey(): string {
  const key = process.env.LOVABLE_API_KEY || "";
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return key;
}

async function stripeFetch(path: string, init?: RequestInit & { form?: Record<string, string> }) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getLovableKey()}`,
    "X-Connection-Api-Key": getStripeKey(),
  };
  let body: BodyInit | undefined = init?.body as BodyInit | undefined;
  if (init?.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init?.method || "GET",
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

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
});

export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_slug: data.tour_slug,
        tour_title: data.tour_title,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone ?? null,
        travel_date: data.travel_date || null,
        guests: data.guests,
        notes: [data.time ? `Preferred time: ${data.time}` : null, data.notes]
          .filter(Boolean)
          .join("\n\n") || null,
        total_estimate: Math.round(data.amount / 100),
        amount_total: data.amount,
        status: "new",
        payment_status: "pending",
      })
      .select("id")
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking insert failed");

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const form: Record<string, string> = {
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(data.amount),
      "line_items[0][price_data][product_data][name]": `${data.tour_title} · ${data.guests} guest${data.guests === 1 ? "" : "s"}`,
      "line_items[0][price_data][product_data][description]":
        `Tuk Tuk 24 tour${data.travel_date ? ` on ${data.travel_date}` : ""}${data.time ? ` at ${data.time}` : ""}`.slice(0, 500),
      customer_email: data.email,
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      "metadata[booking_id]": booking.id,
      "metadata[tour_slug]": data.tour_slug,
      "metadata[guests]": String(data.guests),
    };
    if (data.image_url) {
      form["line_items[0][price_data][product_data][images][0]"] = data.image_url;
    }

    const session = await stripeFetch("/v1/checkout/sessions", {
      method: "POST",
      form,
    });

    await supabaseAdmin.from("orders").insert({
      booking_id: booking.id,
      stripe_session_id: session.id,
      amount_total: data.amount,
      currency: "eur",
      payment_status: "pending",
      customer_name: data.customer_name,
      customer_email: data.email,
      tour_title: data.tour_title,
      tour_slug: data.tour_slug,
      guests: data.guests,
      travel_date: data.travel_date || null,
    });

    return { url: session.url as string, sessionId: session.id as string };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ session_id: z.string().min(5).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const session = await stripeFetch(
      `/v1/checkout/sessions/${encodeURIComponent(data.session_id)}`,
    );

    const paid = session.payment_status === "paid";
    const newStatus = paid ? "paid" : session.payment_status || "pending";

    const { data: order } = await supabaseAdmin
      .from("orders")
      .update({
        payment_status: newStatus,
        stripe_payment_intent_id: session.payment_intent || null,
      })
      .eq("stripe_session_id", data.session_id)
      .select("booking_id, tour_title, amount_total, customer_name")
      .maybeSingle();

    if (order?.booking_id && paid) {
      await supabaseAdmin
        .from("bookings")
        .update({ payment_status: "paid", status: "confirmed" })
        .eq("id", order.booking_id);
    }

    return {
      paid,
      status: newStatus,
      tour_title: order?.tour_title || null,
      amount_total: order?.amount_total || 0,
      customer_name: order?.customer_name || null,
    };
  });
