import { createFileRoute } from "@tanstack/react-router";

type StripeEnv = "sandbox" | "live";

async function verifyStripeWebhook(req: Request, env: StripeEnv) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"]
      : process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook secret not configured");
  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1" && v) v1.push(v);
  }
  if (!timestamp || v1.length === 0) throw new Error("Invalid signature format");
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (!v1.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } };
}

async function markPaid(session: Record<string, unknown>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { applyModificationToBooking } = await import("@/lib/booking-changes.server");

  const sessionId = String(session["id"] || "");
  const metadata = (session["metadata"] || {}) as Record<string, string>;
  const bookingId = metadata["booking_id"];
  const modificationId = metadata["modification_id"];

  await supabaseAdmin
    .from("orders")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: String(session["payment_intent"] || sessionId),
      raw: JSON.parse(JSON.stringify(session)),
    })
    .eq("stripe_session_id", sessionId);

  if (bookingId && !modificationId) {
    await supabaseAdmin
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", bookingId);
  }

  if (modificationId) {
    await supabaseAdmin
      .from("booking_modifications")
      .update({ payment_status: "paid", status: "approved" })
      .eq("id", modificationId);
    await applyModificationToBooking(supabaseAdmin, modificationId);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          const event = await verifyStripeWebhook(request, rawEnv);
          const object = event.data.object;
          if (
            event.type === "checkout.session.completed" &&
            object["payment_status"] !== "unpaid"
          ) {
            await markPaid(object);
          } else if (event.type === "checkout.session.async_payment_succeeded") {
            await markPaid(object);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Stripe webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
