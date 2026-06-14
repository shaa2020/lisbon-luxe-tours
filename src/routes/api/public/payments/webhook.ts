import { createFileRoute } from "@tanstack/react-router";
import { verifyWebhookRequest } from "@lovable.dev/webhooks-js";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = url.searchParams.get("env") === "live" ? "live" : "sandbox";
        const secret =
          env === "live"
            ? process.env.PAYMENTS_LIVE_WEBHOOK_SECRET
            : process.env.PAYMENTS_SANDBOX_WEBHOOK_SECRET;

        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        let payload: any;
        try {
          const verified = await verifyWebhookRequest({ req: request, secret });
          payload = verified.payload;
        } catch (e) {
          return new Response(`Invalid signature: ${(e as Error).message}`, { status: 401 });
        }

        const type: string = payload?.type || payload?.event || "";
        const data: any = payload?.data || payload?.object || payload || {};

        // Try every plausible location for the Stripe session id and our booking id
        const sessionId: string | undefined =
          data?.session_id ||
          data?.checkout_session_id ||
          data?.id ||
          data?.object?.id ||
          data?.stripe?.session?.id;

        const bookingId: string | undefined =
          data?.metadata?.booking_id ||
          data?.object?.metadata?.booking_id ||
          payload?.metadata?.booking_id;

        const paymentIntentId: string | undefined =
          data?.payment_intent ||
          data?.object?.payment_intent ||
          data?.payment_intent_id;

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          if (type === "transaction.completed" || type === "checkout.session.completed") {
            const update = {
              payment_status: "paid",
              stripe_payment_intent_id: paymentIntentId || null,
              raw: payload,
            };
            const q = supabaseAdmin.from("orders").update(update);
            if (sessionId) await q.eq("stripe_session_id", sessionId);
            else if (bookingId) await q.eq("booking_id", bookingId);

            if (bookingId) {
              await supabaseAdmin
                .from("bookings")
                .update({ payment_status: "paid", status: "confirmed" })
                .eq("id", bookingId);
            } else if (sessionId) {
              const { data: ord } = await supabaseAdmin
                .from("orders")
                .select("booking_id")
                .eq("stripe_session_id", sessionId)
                .maybeSingle();
              if (ord?.booking_id) {
                await supabaseAdmin
                  .from("bookings")
                  .update({ payment_status: "paid", status: "confirmed" })
                  .eq("id", ord.booking_id);
              }
            }
          } else if (type === "transaction.payment_failed") {
            const q = supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", raw: payload });
            if (sessionId) await q.eq("stripe_session_id", sessionId);
            else if (bookingId) await q.eq("booking_id", bookingId);
          }
        } catch (e) {
          console.error("[payments webhook]", e);
          // Still return 200 so Lovable doesn't retry indefinitely on DB hiccups
        }

        return Response.json({ received: true });
      },
    },
  },
});
