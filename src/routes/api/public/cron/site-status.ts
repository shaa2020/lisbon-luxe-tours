import { createFileRoute } from "@tanstack/react-router";

/** Uptime check, called every 5 minutes by the scheduler with the service key. */
export const Route = createFileRoute("/api/public/cron/site-status")({
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
        const { runSiteChecks } = await import("@/lib/site-status.server");
        const results = await runSiteChecks(supabaseAdmin as never);
        return Response.json({ ok: true, results: results.map((r) => ({ url: r.url, ok: r.ok })) });
      },
    },
  },
});
