import { createFileRoute } from "@tanstack/react-router";

/**
 * Mollie webhook. Mollie POSTs `id=tr_xxx` as form data with no signature,
 * so we always re-fetch the payment from the API before trusting anything.
 */
export const Route = createFileRoute("/api/public/payments/mollie")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let paymentId = "";
        try {
          const form = await request.formData();
          paymentId = String(form.get("id") || "");
        } catch {
          try {
            const body = (await request.json()) as { id?: string };
            paymentId = String(body?.id || "");
          } catch {
            paymentId = "";
          }
        }
        if (!paymentId.startsWith("tr_")) {
          return new Response("Missing payment id", { status: 400 });
        }

        try {
          const { getMolliePayment } = await import("@/lib/mollie.server");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { applyModificationToBooking } = await import("@/lib/booking-changes.server");

          const payment = await getMolliePayment(paymentId);
          const paid = payment.status === "paid";
          const bookingId = payment.metadata?.["booking_id"];
          const modificationId = payment.metadata?.["modification_id"];

          await supabaseAdmin
            .from("orders")
            .update({
              payment_status: paid ? "paid" : payment.status,
              stripe_payment_intent_id: payment.id,
              raw: JSON.parse(JSON.stringify(payment)),
            })
            .eq("stripe_session_id", paymentId);

          if (paid && bookingId && !modificationId) {
            await supabaseAdmin
              .from("bookings")
              .update({ payment_status: "paid", status: "confirmed" })
              .eq("id", bookingId);
          }

          if (paid && modificationId) {
            await supabaseAdmin
              .from("booking_modifications")
              .update({ payment_status: "paid", status: "approved" })
              .eq("id", modificationId);
            await applyModificationToBooking(supabaseAdmin, modificationId);
          }

          return new Response("ok");
        } catch (e) {
          return new Response(`Webhook error: ${(e as Error).message}`, { status: 500 });
        }
      },
    },
  },
});
