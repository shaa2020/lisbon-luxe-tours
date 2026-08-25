import { createFileRoute } from "@tanstack/react-router";

/**
 * Automated customer emails:
 *  - reminder the day before the tour
 *  - review request the day after the tour
 * Called by a scheduler with the shared secret in the `x-cron-secret` header.
 */
export const Route = createFileRoute("/api/public/cron/booking-emails")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });
        if (request.headers.get("x-cron-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendBookingEmail, BOOKING_SELECT } = await import("@/lib/bookings-admin.server");

        const { data: settings } = await supabaseAdmin
          .from("site_settings")
          .select("auto_reminder_enabled,auto_review_request_enabled")
          .eq("id", true)
          .maybeSingle();

        const day = (offset: number) => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() + offset);
          return d.toISOString().slice(0, 10);
        };

        let reminders = 0;
        let reviews = 0;

        if (settings?.auto_reminder_enabled) {
          const { data: rows } = await supabaseAdmin
            .from("bookings")
            .select(BOOKING_SELECT)
            .eq("travel_date", day(1))
            .eq("auto_emails_opt_out", false)
            .is("reminder_sent_at", null)
            .in("status", ["new", "quoted", "confirmed"]);
          for (const b of rows ?? []) {
            try {
              await sendBookingEmail(supabaseAdmin, b as any, "tour_reminder");
              await supabaseAdmin
                .from("bookings")
                .update({ reminder_sent_at: new Date().toISOString() })
                .eq("id", b.id);
              reminders++;
            } catch (err) {
              console.error("reminder failed", b.id, err);
            }
          }
        }

        if (settings?.auto_review_request_enabled) {
          const { data: rows } = await supabaseAdmin
            .from("bookings")
            .select(BOOKING_SELECT)
            .eq("travel_date", day(-1))
            .eq("auto_emails_opt_out", false)
            .is("review_request_sent_at", null)
            .neq("status", "cancelled");
          for (const b of rows ?? []) {
            try {
              await sendBookingEmail(supabaseAdmin, b as any, "review_request");
              await supabaseAdmin
                .from("bookings")
                .update({ review_request_sent_at: new Date().toISOString() })
                .eq("id", b.id);
              reviews++;
            } catch (err) {
              console.error("review request failed", b.id, err);
            }
          }
        }

        return Response.json({ ok: true, reminders, reviews });
      },
    },
  },
});
