import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";

export type SiteCheck = {
  url: string;
  ok: boolean;
  status_code: number | null;
  response_ms: number | null;
  error: string | null;
  checked_at: string;
};

export const getSiteStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { MONITORED_URLS } = await import("./site-status.server");
    const since = new Date(Date.now() - 24 * 3600e3).toISOString();
    const { data } = await supabaseAdmin
      .from("site_status_checks" as never)
      .select("url, ok, status_code, response_ms, error, checked_at")
      .gte("checked_at", since)
      .order("checked_at", { ascending: false })
      .limit(1000);
    const rows = (data ?? []) as unknown as SiteCheck[];
    return MONITORED_URLS.map((url) => {
      const mine = rows.filter((r) => r.url === url);
      const up = mine.filter((r) => r.ok).length;
      return {
        url,
        latest: mine[0] ?? null,
        uptime24h: mine.length ? Math.round((up / mine.length) * 1000) / 10 : null,
        lastDown: mine.find((r) => !r.ok)?.checked_at ?? null,
      };
    });
  });

export const runSiteCheckNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runSiteChecks } = await import("./site-status.server");
    await runSiteChecks(supabaseAdmin as never);
    return { ok: true };
  });
