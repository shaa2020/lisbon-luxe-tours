import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";
import {
  MAX_LEADS_PER_JOB,
  domainOf,
  estimateCompanyResearchCredits,
  estimateContentResearchCredits,
  estimateLeadJobCredits,
  estimateSeoResearchCredits,
  NOT_FOUND,
  type UsageSnapshot,
} from "./web-intel";

/** Everything here is manual: no background jobs, no scheduled Firecrawl usage. */

const fc = () => import("./firecrawl.server");

async function openJob(
  jobType: string,
  query: string,
  params: Record<string, unknown>,
  mode: string | null,
  context: { userId: string; claims?: any },
) {
  const { admin } = await fc();
  const db = await admin();
  const { data, error } = await db
    .from("research_jobs")
    .insert({
      job_type: jobType,
      mode,
      query,
      params: params as never,
      status: "running",
      actor: context.userId,
      actor_email: (context.claims?.email as string) ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function closeJob(
  jobId: string,
  patch: Record<string, unknown>,
) {
  const { admin } = await fc();
  const db = await admin();
  await db.from("research_jobs").update(patch as never).eq("id", jobId);
}

async function jobCredits(jobId: string) {
  const { admin } = await fc();
  const db = await admin();
  const { data } = await db.from("firecrawl_usage_log").select("credits,kind").eq("job_id", jobId);
  let credits = 0;
  let searches = 0;
  let pages = 0;
  for (const r of data ?? []) {
    credits += Number(r.credits ?? 0);
    if (r.kind === "search") searches += 1;
    if (r.kind === "scrape") pages += 1;
  }
  return { credits, searches, pages };
}

async function fail(jobId: string, err: unknown): Promise<never> {
  const { credits, searches, pages } = await jobCredits(jobId);
  const message = err instanceof Error ? err.message : "Research failed.";
  const cancelled = message.includes("free Firecrawl") || message.includes("Free Firecrawl");
  await closeJob(jobId, {
    status: cancelled ? "cancelled" : "failed",
    error: message,
    credits_used: credits,
    searches,
    pages,
  });
  throw new Error(message);
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

export const getWebIntelOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    usage: UsageSnapshot;
    connected: boolean;
    pendingLeads: number;
    recentJobs: any[];
  }> => {
    await assertRole(context as never, "staff");
    const { getUsageSnapshot, admin } = await fc();
    const usage = await getUsageSnapshot();
    const db = await admin();

    const { count } = await db
      .from("research_leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    const { data: recentJobs } = await db
      .from("research_jobs")
      .select("id,job_type,mode,query,status,credits_used,leads_found,created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      usage,
      connected: Boolean(process.env["FIRECRAWL_API_KEY"] && process.env["LOVABLE_API_KEY"]),
      pendingLeads: count ?? 0,
      recentJobs: recentJobs ?? [],
    };
  });

export const updateWebIntelSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        monthly_credit_limit: z.number().int().min(0).max(100000),
        low_threshold_percent: z.number().int().min(10).max(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { admin } = await fc();
    const db = await admin();
    const { error } = await db
      .from("web_intel_settings")
      .update({ ...data, paid_usage_enabled: false, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Lead finder                                                         */
/* ------------------------------------------------------------------ */

const MARKET_HINT: Record<string, string> = {
  eu: "in Europe (Germany, France, Netherlands, Spain, Italy, Belgium, Nordics)",
  uk: "in the United Kingdom",
  usa: "in the United States",
  canada: "in Canada",
};

const SKIP_HOSTS = [
  "tripadvisor.",
  "facebook.",
  "instagram.",
  "linkedin.",
  "youtube.",
  "twitter.",
  "x.com",
  "reddit.",
  "wikipedia.",
  "yelp.",
  "getyourguide.",
  "viator.",
  "booking.com",
  "expedia.",
  "indeed.",
  "glassdoor.",
  "pinterest.",
];

const leadSchema = {
  name: "leads",
  schema: {
    type: "object",
    properties: {
      leads: {
        type: "array",
        items: {
          type: "object",
          properties: {
            company: { type: "string" },
            country: { type: "string" },
            city: { type: "string" },
            website: { type: "string" },
            business_type: { type: "string" },
            tourism_focus: { type: "string" },
            portugal_relevance: { type: "string" },
            lisbon_relevance: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            contact_page: { type: "string" },
            reason: { type: "string" },
            relevance_score: { type: "number" },
            qualified: { type: "boolean" },
          },
          required: ["company", "qualified"],
        },
      },
    },
    required: ["leads"],
  },
};

export const runLeadSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        markets: z.array(z.string()).min(1),
        leadTypes: z.array(z.string()).min(1),
        leadCount: z.number().int().min(1).max(MAX_LEADS_PER_JOB),
        mode: z.enum(["quick", "standard", "deep"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { assertBudget, fcSearch, fcScrape, extractContacts, callAI, admin } = await fc();

    const estimate = estimateLeadJobCredits(data.leadCount, data.mode);
    await assertBudget(estimate);

    const jobId = await openJob(
      "lead_finder",
      `${data.leadTypes.join(", ")} — ${data.markets.join(", ")}`,
      data as never,
      data.mode,
      context as never,
    );

    try {
      // 1. Search (few, targeted queries — never a crawl).
      const queries: string[] = [];
      for (const market of data.markets) {
        for (const type of data.leadTypes.slice(0, 4)) {
          queries.push(`${type} ${MARKET_HINT[market] ?? ""} selling Portugal and Lisbon tours`);
        }
      }
      const maxQueries = data.mode === "quick" ? 2 : data.mode === "standard" ? 4 : 6;
      const perQuery = Math.max(5, Math.ceil((data.leadCount * 2) / maxQueries));

      const hits: { url: string; title: string; description: string }[] = [];
      for (const q of queries.slice(0, maxQueries)) {
        const found = await fcSearch(q, Math.min(perQuery, 20), jobId);
        hits.push(...found);
        if (hits.length >= data.leadCount * 2) break;
      }

      // 2. Keep only promising, de-duplicated business sites.
      const seen = new Set<string>();
      const candidates: { url: string; title: string; description: string; domain: string }[] = [];
      for (const h of hits) {
        const d = domainOf(h.url);
        if (!d || seen.has(d)) continue;
        if (SKIP_HOSTS.some((s) => d.includes(s))) continue;
        seen.add(d);
        candidates.push({ ...h, domain: d });
      }

      // 3. Scrape only the most promising sites.
      const scrapeBudget =
        data.mode === "quick"
          ? Math.ceil(data.leadCount / 2)
          : data.mode === "standard"
            ? data.leadCount
            : Math.ceil(data.leadCount * 1.5);

      const enriched: any[] = [];
      for (const c of candidates.slice(0, Math.min(scrapeBudget, candidates.length))) {
        if (enriched.length >= data.leadCount) break;
        let markdown = "";
        try {
          markdown = await fcScrape(c.url, jobId);
        } catch (e) {
          if (e instanceof Error && e.name === "FreeTierStopError") break;
          continue;
        }
        const contacts = extractContacts(markdown);
        enriched.push({
          domain: c.domain,
          website: c.url,
          title: c.title,
          description: c.description,
          email: contacts.email,
          phone: contacts.phone,
          text: markdown.slice(0, 4000),
        });
      }

      const pool = enriched.length ? enriched : candidates.slice(0, data.leadCount).map((c) => ({
        domain: c.domain,
        website: c.url,
        title: c.title,
        description: c.description,
        email: null,
        phone: null,
        text: "",
      }));

      // 4. AI qualification — no invented facts.
      const ai = await callAI(
        [
          {
            role: "system",
            content:
              "You qualify B2B travel-trade leads for TukTuk24, a private tuk tuk tour operator in Lisbon, Portugal. " +
              "Use ONLY the supplied public page content. Never invent a company name, email, phone or fact. " +
              `If a field is unknown put exactly "${NOT_FOUND}". Set qualified=false for anything that is not a real travel business that could send clients to Lisbon (directories, blogs, job boards, competitors in Lisbon itself).`,
          },
          {
            role: "user",
            content: `Target markets: ${data.markets.join(", ")}\nWanted business types: ${data.leadTypes.join(", ")}\n\nSources:\n${JSON.stringify(pool).slice(0, 90000)}`,
          },
        ],
        leadSchema,
      );

      const db = await admin();
      const rows = (ai?.leads ?? [])
        .filter((l: any) => l?.qualified !== false && l?.company)
        .slice(0, data.leadCount)
        .map((l: any) => {
          const src = pool.find((p) => p.website === l.website || p.domain === domainOf(l.website));
          const website = l.website && l.website !== NOT_FOUND ? l.website : src?.website ?? null;
          const clean = (v: unknown) => {
            const s = typeof v === "string" ? v.trim() : "";
            return s && s !== NOT_FOUND ? s : null;
          };
          return {
            job_id: jobId,
            company: String(l.company).slice(0, 200),
            country: clean(l.country),
            city: clean(l.city),
            website,
            domain: domainOf(website),
            business_type: clean(l.business_type),
            tourism_focus: clean(l.tourism_focus),
            portugal_relevance: clean(l.portugal_relevance),
            lisbon_relevance: clean(l.lisbon_relevance),
            email: clean(l.email) ?? src?.email ?? null,
            phone: clean(l.phone) ?? src?.phone ?? null,
            contact_page: clean(l.contact_page),
            source_url: src?.website ?? website,
            reason: clean(l.reason),
            relevance_score: Number.isFinite(l.relevance_score) ? Math.round(l.relevance_score) : null,
            status: "new",
          };
        });

      if (rows.length) {
        const { error } = await db.from("research_leads").insert(rows as never);
        if (error) throw new Error(error.message);
      }

      const { credits, searches, pages } = await jobCredits(jobId);
      await closeJob(jobId, {
        status: "completed",
        credits_used: credits,
        searches,
        pages,
        leads_found: rows.length,
        sources: pool.map((p) => p.website) as never,
      });

      return { ok: true, jobId, leads: rows.length, creditsUsed: credits };
    } catch (err) {
      return await fail(jobId, err);
    }
  });

/* ------------------------------------------------------------------ */
/* Lead review + CRM import                                            */
/* ------------------------------------------------------------------ */

export const listResearchLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.string().default("new") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "staff");
    const { admin } = await fc();
    const db = await admin();
    let q = db.from("research_leads").select("*").order("created_at", { ascending: false }).limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setResearchLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["new", "ignored"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { admin } = await fc();
    const db = await admin();
    const { error } = await db.from("research_leads").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importResearchLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { admin } = await fc();
    const db = await admin();

    const { data: lead, error } = await db.from("research_leads").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!lead) throw new Error("Lead not found");

    // Duplicate protection against the existing CRM.
    const or: string[] = [];
    if (lead.domain) or.push(`domain.eq.${lead.domain}`);
    if (lead.company) or.push(`company.eq.${lead.company.replace(/,/g, " ")}`);
    if (lead.email) or.push(`email.eq.${lead.email}`);
    if (lead.phone) or.push(`phone.eq.${lead.phone}`);

    if (or.length) {
      const { data: existing } = await db.from("leads").select("id,company,email").or(or.join(",")).limit(1);
      if (existing && existing.length) {
        await db.from("research_leads").update({ status: "duplicate", crm_lead_id: existing[0].id }).eq("id", lead.id);
        return { ok: false, duplicate: true, crmLeadId: existing[0].id };
      }
    }

    const { data: created, error: insErr } = await db
      .from("leads")
      .insert({
        name: lead.company,
        company: lead.company,
        country: lead.country,
        city: lead.city,
        website: lead.website,
        domain: lead.domain,
        business_type: lead.business_type,
        relevance_reason: lead.reason,
        source_url: lead.source_url,
        email: lead.email,
        phone: lead.phone,
        lead_kind: "partner",
        source: "web_intelligence",
        status: "new",
        language: "en",
        notes: [lead.tourism_focus, lead.portugal_relevance, lead.lisbon_relevance, lead.contact_page]
          .filter(Boolean)
          .join("\n"),
      } as never)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    await db.from("research_leads").update({ status: "imported", crm_lead_id: created.id }).eq("id", lead.id);
    await db.from("admin_audit_log").insert({
      actor: context.userId,
      actor_email: (context as any).claims?.email ?? null,
      entity: "lead",
      entity_id: created.id,
      action: "import_from_web_intelligence",
      summary: `Imported ${lead.company} into the CRM from Web Intelligence`,
    } as never);

    return { ok: true, duplicate: false, crmLeadId: created.id };
  });

/* ------------------------------------------------------------------ */
/* Company / competitor research                                       */
/* ------------------------------------------------------------------ */

const companySchema = {
  name: "company_research",
  schema: {
    type: "object",
    properties: {
      company: { type: "string" },
      description: { type: "string" },
      tourism_services: { type: "array", items: { type: "string" } },
      locations_served: { type: "array", items: { type: "string" } },
      portugal_relevance: { type: "string" },
      lisbon_relevance: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      contact_page: { type: "string" },
      partnership_opportunity: { type: "string" },
    },
    required: ["company", "description"],
  },
};

export const runCompanyResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        input: z.string().min(2).max(300),
        kind: z.enum(["company", "competitor"]).default("company"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { assertBudget, fcSearch, fcScrape, extractContacts, callAI } = await fc();
    await assertBudget(estimateCompanyResearchCredits());

    const jobId = await openJob(data.kind === "competitor" ? "competitor" : "company", data.input, data as never, null, context as never);

    try {
      let url = data.input.trim();
      if (!/^https?:\/\//i.test(url) && !url.includes(".")) {
        const hits = await fcSearch(`${data.input} official website travel`, 3, jobId);
        url = hits[0]?.url ?? "";
        if (!url) throw new Error("Could not find a website for that company.");
      } else if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }

      const home = await fcScrape(url, jobId);
      const contacts = extractContacts(home);

      const analysis = await callAI(
        [
          {
            role: "system",
            content:
              (data.kind === "competitor"
                ? "You analyse a competitor of TukTuk24, a private tuk tuk tour operator in Lisbon. "
                : "You research a potential travel-trade partner for TukTuk24, a private tuk tuk tour operator in Lisbon. ") +
              `Use ONLY the supplied page content. Never invent contact details or facts. Unknown fields must be exactly "${NOT_FOUND}".`,
          },
          { role: "user", content: `Website: ${url}\n\nPage content:\n${home.slice(0, 40000)}` },
        ],
        companySchema,
      );

      const result = {
        ...analysis,
        website: url,
        email: analysis?.email && analysis.email !== NOT_FOUND ? analysis.email : contacts.email ?? NOT_FOUND,
        phone: analysis?.phone && analysis.phone !== NOT_FOUND ? analysis.phone : contacts.phone ?? NOT_FOUND,
      };

      const { credits, searches, pages } = await jobCredits(jobId);
      await closeJob(jobId, {
        status: "completed",
        credits_used: credits,
        searches,
        pages,
        sources: [url] as never,
        result: result as never,
      });
      return { ok: true, jobId, result, creditsUsed: credits };
    } catch (err) {
      return await fail(jobId, err);
    }
  });

/* ------------------------------------------------------------------ */
/* SEO / content research                                              */
/* ------------------------------------------------------------------ */

const insightSchema = {
  name: "research_insights",
  schema: {
    type: "object",
    properties: {
      topics: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
      opportunities: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
      competitor_pages: { type: "array", items: { type: "string" } },
      facts: { type: "array", items: { type: "string" } },
      sources: { type: "array", items: { type: "string" } },
    },
    required: ["topics", "questions"],
  },
};

export const runInsightResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        query: z.string().min(3).max(200),
        kind: z.enum(["seo", "content"]),
        pages: z.number().int().min(1).max(5).default(3),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "manager");
    const { assertBudget, fcSearch, fcScrape, callAI } = await fc();
    const estimate =
      data.kind === "seo" ? estimateSeoResearchCredits(data.pages) : estimateContentResearchCredits(data.pages);
    await assertBudget(estimate);

    const jobId = await openJob(data.kind, data.query, data as never, null, context as never);

    try {
      const hits = await fcSearch(data.query, 10, jobId);
      const picks = hits
        .filter((h) => {
          const d = domainOf(h.url);
          return d && !SKIP_HOSTS.some((s) => d.includes(s));
        })
        .slice(0, data.pages);

      const sources: { url: string; title: string; text: string }[] = [];
      for (const p of picks) {
        try {
          sources.push({ url: p.url, title: p.title, text: await fcScrape(p.url, jobId) });
        } catch (e) {
          if (e instanceof Error && e.name === "FreeTierStopError") break;
        }
      }

      const insights = await callAI(
        [
          {
            role: "system",
            content:
              `You help TukTuk24 (private tuk tuk tours in Lisbon) with ${data.kind === "seo" ? "SEO" : "content"} research. ` +
              "Use ONLY the supplied public pages. Never invent facts, prices or statistics. Always list the source URLs you used.",
          },
          {
            role: "user",
            content: `Query: ${data.query}\n\nSearch results:\n${JSON.stringify(hits).slice(0, 8000)}\n\nScraped pages:\n${JSON.stringify(sources).slice(0, 60000)}`,
          },
        ],
        insightSchema,
      );

      const { credits, searches, pages } = await jobCredits(jobId);
      await closeJob(jobId, {
        status: "completed",
        credits_used: credits,
        searches,
        pages,
        sources: sources.map((s) => s.url) as never,
        result: insights as never,
      });
      return { ok: true, jobId, result: insights, creditsUsed: credits };
    } catch (err) {
      return await fail(jobId, err);
    }
  });

export const listResearchJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ type: z.string().default("all") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertRole(context as never, "staff");
    const { admin } = await fc();
    const db = await admin();
    let q = db.from("research_jobs").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.type !== "all") q = q.eq("job_type", data.type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
