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
        const cronSecret = process.env["CRON_SECRET"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const header = request.headers.get("x-cron-secret");
        const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
        const authorized =
          (!!cronSecret && header === cronSecret) || (!!serviceKey && bearer === serviceKey);
        if (!authorized) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendBookingEmail, BOOKING_SELECT } = await import("@/lib/bookings-admin.server");

        const { data: settings } = await supabaseAdmin
          .from("site_settings")
          .select("auto_reminder_enabled,auto_review_request_enabled")
          .eq("id", true)
          .maybeSingle();

        const lisbonDay = (offset: number) => {
          const now = new Date();
          now.setDate(now.getDate() + offset);
          return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Europe/Lisbon",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(now);
        };

        let reminders = 0;
        let reviews = 0;

        if (settings?.auto_reminder_enabled) {
          const { data: rows } = await supabaseAdmin
            .from("bookings")
            .select(BOOKING_SELECT)
            .gte("travel_date", lisbonDay(0))
            .lte("travel_date", lisbonDay(1))
            .eq("auto_emails_opt_out", false)
            .is("reminder_sent_at", null)
            .in("status", ["new", "quoted", "confirmed"]);
          for (const b of rows ?? []) {
            try {
              const result = await sendBookingEmail(supabaseAdmin, b as any, "tour_reminder");
              if (!result.queued) continue;
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
            .lte("travel_date", lisbonDay(-1))
            .eq("auto_emails_opt_out", false)
            .is("review_request_sent_at", null)
            .neq("status", "cancelled");
          for (const b of rows ?? []) {
            try {
              const result = await sendBookingEmail(supabaseAdmin, b as any, "review_request");
              if (!result.queued) continue;
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
