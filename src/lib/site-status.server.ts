/** Website uptime checks. Server-only. */
export const MONITORED_URLS = ["https://tuktuk24lisbon.com/", "https://www.tuktuk24lisbon.com/"];

type Admin = { from: (t: string) => any };

async function checkOne(url: string) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "TukTuk24-StatusCheck/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const ms = Date.now() - started;
    // Drain body so the connection is released.
    await res.text().catch(() => "");
    return { url, ok: res.status < 400, status_code: res.status, response_ms: ms, error: res.status < 400 ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { url, ok: false, status_code: null, response_ms: Date.now() - started, error: (e as Error)?.message?.slice(0, 200) || "Request failed" };
  }
}

/** Runs all checks, stores them, and pushes an alert when a site changes between up and down. */
export async function runSiteChecks(admin: Admin) {
  const results = [];
  for (const url of MONITORED_URLS) {
    let r = await checkOne(url);
    // One quick retry so a single blip doesn't wake you up.
    if (!r.ok) {
      await new Promise((ok) => setTimeout(ok, 3000));
      r = await checkOne(url);
    }
    const { data: prev } = await admin
      .from("site_status_checks")
      .select("ok")
      .eq("url", url)
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    await admin.from("site_status_checks").insert(r);
    const changed = prev ? prev.ok !== r.ok : !r.ok;
    if (changed) {
      const { sendAdminPush } = await import("./push.server");
      const host = new URL(url).host;
      await sendAdminPush(admin, r.ok
        ? { title: "Website back online", body: `${host} is working again.`, url: "/admin", tag: `site-status-${host}` }
        : { title: "Website is DOWN", body: `${host} is not responding (${r.error}).`, url: "/admin", tag: `site-status-${host}` });
    }
    results.push(r);
  }
  // Keep the log small: drop checks older than 30 days.
  await admin.from("site_status_checks").delete().lt("checked_at", new Date(Date.now() - 30 * 864e5).toISOString());
  return results;
}
