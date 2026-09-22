/**
 * Firecrawl access, FREE TIER ONLY.
 *
 * Every request goes through this module so that:
 *  - the API key never leaves the server,
 *  - every credit is counted in public.firecrawl_usage_log,
 *  - a request is refused whenever the estimated cost would exceed the free
 *    monthly allowance (hard stop — we never fall back to paid usage).
 */

import { usageStatus, type UsageSnapshot } from "./web-intel";

const GATEWAY = "https://connector-gateway.lovable.dev/firecrawl/v2";

export class FreeTierStopError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FreeTierStopError";
  }
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function monthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getUsageSnapshot(): Promise<UsageSnapshot> {
  const db = await admin();
  const from = monthStart().toISOString();

  const { data: settings } = await db
    .from("web_intel_settings")
    .select("monthly_credit_limit,low_threshold_percent")
    .eq("id", true)
    .maybeSingle();

  const monthlyLimit = Number(settings?.monthly_credit_limit ?? 500);
  const lowThresholdPercent = Number(settings?.low_threshold_percent ?? 80);

  const { data: usage } = await db
    .from("firecrawl_usage_log")
    .select("credits,kind")
    .gte("created_at", from);

  let creditsUsed = 0;
  let searches = 0;
  let pages = 0;
  for (const row of usage ?? []) {
    creditsUsed += Number(row.credits ?? 0);
    if (row.kind === "search") searches += 1;
    if (row.kind === "scrape") pages += 1;
  }

  const { data: jobs } = await db
    .from("research_jobs")
    .select("id,leads_found")
    .gte("created_at", from);

  const researchJobs = jobs?.length ?? 0;
  const leadsFound = (jobs ?? []).reduce((s, j) => s + Number(j.leads_found ?? 0), 0);

  const creditsRemaining = Math.max(0, monthlyLimit - creditsUsed);
  const usagePercent = monthlyLimit > 0 ? Math.min(100, Math.round((creditsUsed / monthlyLimit) * 100)) : 100;

  return {
    monthlyLimit,
    creditsUsed,
    creditsRemaining,
    usagePercent,
    lowThresholdPercent,
    status: usageStatus(creditsUsed, monthlyLimit, lowThresholdPercent),
    paidUsageEnabled: false,
    searches,
    pages,
    researchJobs,
    leadsFound,
    monthLabel: monthStart().toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

/** Hard stop: refuse before spending anything we cannot cover for free. */
export async function assertBudget(estimatedCredits: number): Promise<UsageSnapshot> {
  const snap = await getUsageSnapshot();
  if (snap.status === "stopped") {
    throw new FreeTierStopError(
      "Free Firecrawl allowance reached. No additional Firecrawl requests will be made.",
    );
  }
  if (estimatedCredits > snap.creditsRemaining) {
    throw new FreeTierStopError("Research cancelled to protect your free Firecrawl allowance.");
  }
  return snap;
}

async function recordUsage(kind: string, credits: number, jobId: string | null, detail: string) {
  const db = await admin();
  await db.from("firecrawl_usage_log").insert({
    kind,
    credits,
    job_id: jobId,
    detail: detail.slice(0, 300),
  });
}

async function gateway(path: string, body: unknown): Promise<any> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Firecrawl is not connected yet.");
  }

  const res = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    if (res.status === 402 || (res.status === 403 && text.includes("Credit limit"))) {
      throw new FreeTierStopError("Firecrawl free allowance is currently exhausted.");
    }
    throw new Error(`Firecrawl request failed (${res.status}). ${text.slice(0, 300)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Firecrawl returned an unreadable response.");
  }
}

export type SearchHit = { url: string; title: string; description: string };

/** One search. Cost is counted as one credit per requested result. */
export async function fcSearch(
  query: string,
  limit: number,
  jobId: string | null,
  /** Optional freshness filter, e.g. "qdr:m" for the last month. */
  tbs?: string,
): Promise<SearchHit[]> {
  await assertBudget(limit);
  const json = await gateway("/search", tbs ? { query, limit, tbs } : { query, limit });
  await recordUsage("search", limit, jobId, query);

  const rows: any[] = json?.data?.web ?? json?.web ?? json?.data ?? [];
  return (Array.isArray(rows) ? rows : [])
    .filter((r) => typeof r?.url === "string")
    .map((r) => ({
      url: String(r.url),
      title: String(r.title ?? ""),
      description: String(r.description ?? ""),
    }));
}

/** One page scrape (markdown only, main content). One credit. */
export async function fcScrape(url: string, jobId: string | null): Promise<string> {
  await assertBudget(1);
  const json = await gateway("/scrape", {
    url,
    formats: ["markdown"],
    onlyMainContent: true,
  });
  await recordUsage("scrape", 1, jobId, url);
  const md = json?.markdown ?? json?.data?.markdown ?? "";
  return typeof md === "string" ? md.slice(0, 12000) : "";
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const PHONE_RE = /\+\d[\d\s().-]{7,}\d/g;

export function extractContacts(markdown: string) {
  const emails = Array.from(new Set((markdown.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase())))
    .filter((e) => !/\.(png|jpg|jpeg|svg|webp|gif)$/.test(e))
    .filter((e) => !/(sentry|wixpress|example|your-?email|domain\.com)/.test(e));
  const phones = Array.from(new Set(markdown.match(PHONE_RE) ?? [])).map((p) => p.trim());
  return { email: emails[0] ?? null, phone: phones[0] ?? null };
}

/** AI qualification / analysis through the Lovable AI gateway (not Firecrawl). */
export async function callAI(
  messages: { role: string; content: string }[],
  schema: { name: string; schema: Record<string, unknown> },
): Promise<any> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      response_format: { type: "json_schema", json_schema: { ...schema, strict: false } },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits in Lovable to continue.");
    throw new Error(`AI request failed (${res.status}). ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned an unreadable answer.");
  }
}
