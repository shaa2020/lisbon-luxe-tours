import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";
import { z } from "zod";

export type BlogDraftFaq = { question: string; answer: string };
export type BlogDraftLink = { path: string; anchor: string; reason: string };
export type BlogDraftFlag = { claim: string; suggestion: string };

export type BlogDraft = {
  seo_title: string;
  meta_description: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  paragraphs: string[];
  faqs: BlogDraftFaq[];
  internal_links: BlogDraftLink[];
  image_notes: string;
  verify_flags: BlogDraftFlag[];
};

const draftSchema = z.object({
  seo_title: z.string(),
  meta_description: z.string(),
  slug: z.string(),
  title: z.string(),
  excerpt: z.string(),
  category: z.string(),
  read_time: z.string(),
  paragraphs: z.array(z.string()),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })),
  internal_links: z.array(z.object({ path: z.string(), anchor: z.string(), reason: z.string() })),
  image_notes: z.string(),
  verify_flags: z.array(z.object({ claim: z.string(), suggestion: z.string() })),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "seo_title",
    "meta_description",
    "slug",
    "title",
    "excerpt",
    "category",
    "read_time",
    "paragraphs",
    "faqs",
    "internal_links",
    "image_notes",
    "verify_flags",
  ],
  properties: {
    seo_title: { type: "string" },
    meta_description: { type: "string" },
    slug: { type: "string" },
    title: { type: "string" },
    excerpt: { type: "string" },
    category: { type: "string" },
    read_time: { type: "string" },
    paragraphs: { type: "array", items: { type: "string" } },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: { question: { type: "string" }, answer: { type: "string" } },
      },
    },
    internal_links: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "anchor", "reason"],
        properties: {
          path: { type: "string" },
          anchor: { type: "string" },
          reason: { type: "string" },
        },
      },
    },
    image_notes: { type: "string" },
    verify_flags: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "suggestion"],
        properties: { claim: { type: "string" }, suggestion: { type: "string" } },
      },
    },
  },
} as const;

const LENGTH_WORDS: Record<string, number> = { short: 600, medium: 1200, long: 2000 };
const DAILY_CAP = 10;
const MONTHLY_CAP = 40;

const SYSTEM = `You are the in-house content writer for TukTuk24, a private tuk-tuk tour company in Lisbon, Portugal.
You write journal/blog articles for the website https://tuktuk24lisbon.com.

STRICT RULES:
- Only reference tours, destinations and business facts supplied to you in the prompt. Never invent tours, prices, reviews, ratings, awards or claims that are not in the supplied material.
- Never state a specific price unless it appears verbatim in the supplied material; prefer "from €X" phrasing using the supplied price_from values.
- Natural, warm, professional English for tourists. No hype, no emojis, no keyword stuffing.
- Write for AI search engines too: clear question-and-answer phrasing, concise factual sentences, no vague filler.
- seo_title: max 60 characters, includes the primary keyword.
- meta_description: max 155 characters, includes the primary keyword.
- slug: lowercase, hyphenated, ascii only.
- title: the on-page H1, descriptive, includes the primary keyword naturally.
- excerpt: 1-2 sentences used as the article teaser.
- category: one short label such as "Travel Tips", "Lisbon Guide", "Food & Drink", "Itineraries".
- read_time: estimate like "6 min read" from the word count (~200 words per minute).
- paragraphs: the full article body as plain-text paragraphs. No markdown, no headings syntax; to introduce a section just start the paragraph with the section title followed by a period. Hit the requested word count.
- faqs: 3-5 question/answer pairs related to the topic, factually consistent with the supplied material.
- internal_links: only paths from the supplied list of real pages. Never invent a URL.
- image_notes: one short paragraph suggesting what cover photo to use.
- verify_flags: any factual claim you were unsure about, with a suggestion of what the admin should check. If none, return an empty array.`;

async function callGateway(messages: { role: string; content: string }[]) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured (missing key).");

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
      response_format: {
        type: "json_schema",
        json_schema: { name: "blog_draft", strict: true, schema: jsonSchema },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("AI is busy right now. Please try again in a moment.");
    if (res.status === 402)
      throw new Error("AI credits are exhausted. Add credits in Lovable to continue.");
    throw new Error(`AI request failed (${res.status}). ${body.slice(0, 300)}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response. Try again.");

  try {
    return draftSchema.parse(JSON.parse(content)) as BlogDraft;
  } catch {
    throw new Error("AI returned an unreadable response. Try again.");
  }
}

const briefSchema = z.object({
  topic: z.string().min(5).max(500),
  primaryKeyword: z.string().max(120).optional().default(""),
  secondaryKeywords: z.array(z.string().max(120)).max(10).optional().default([]),
  intent: z.enum(["informational", "booking"]).default("informational"),
  audience: z.string().max(200).optional().default(""),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  tone: z.enum(["friendly", "professional", "storytelling"]).default("friendly"),
});

type Ctx = Parameters<typeof assertPermission>[0];

async function enforceCaps(supabase: any) {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ count: today }, { count: month }] = await Promise.all([
    supabase.from("ai_generation_log").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
    supabase.from("ai_generation_log").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
  ]);

  if ((today ?? 0) >= DAILY_CAP)
    throw new Error(`Daily AI draft limit reached (${DAILY_CAP}/day). Try again tomorrow.`);
  if ((month ?? 0) >= MONTHLY_CAP)
    throw new Error(`Monthly AI draft limit reached (${MONTHLY_CAP}/month).`);
  return { today: today ?? 0, month: month ?? 0 };
}

async function loadReferenceMaterial(supabase: any) {
  const [tours, destinations, knowledge] = await Promise.all([
    supabase
      .from("tours")
      .select("title, slug, duration, price_from, tagline")
      .eq("published", true)
      .order("sort_order"),
    supabase
      .from("destinations")
      .select("name, slug, heading")
      .eq("published", true)
      .order("sort_order"),
    supabase
      .from("business_knowledge")
      .select("label, content, category")
      .eq("active", true)
      .order("sort_order"),
  ]);

  return {
    tours: (tours.data ?? []) as { title: string; slug: string; duration: string; price_from: number; tagline: string }[],
    destinations: (destinations.data ?? []) as { name: string; slug: string; heading: string }[],
    knowledge: (knowledge.data ?? []) as { label: string; content: string; category: string }[],
  };
}

export const generateBlogDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => briefSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    await enforceCaps(supabase);
    const ref = await loadReferenceMaterial(supabase);

    const words = LENGTH_WORDS[data.length];
    const links = [
      ...ref.tours.map((t) => `/tours/${t.slug}`),
      ...ref.destinations.map((d) => `/destinations/${d.slug}`),
      "/tours",
      "/lisbon-guide",
      "/journal",
      "/contact",
      "/faq",
    ];

    const user = [
      `ARTICLE BRIEF`,
      `Topic: ${data.topic}`,
      data.primaryKeyword ? `Primary keyword: ${data.primaryKeyword}` : "",
      data.secondaryKeywords.length ? `Secondary keywords: ${data.secondaryKeywords.join(", ")}` : "",
      `Intent: ${data.intent === "booking" ? "encourage the reader to book a tour" : "inform the reader"}`,
      data.audience ? `Audience: ${data.audience}` : "",
      `Target length: about ${words} words`,
      `Tone: ${data.tone}`,
      ``,
      `PUBLISHED TOURS (the only tours that exist):`,
      ...ref.tours.map((t) => `- "${t.title}" (${t.duration}, from €${t.price_from}): ${t.tagline ?? ""}`),
      ``,
      `PUBLISHED DESTINATION PAGES:`,
      ...ref.destinations.map((d) => `- "${d.name}": ${d.heading ?? ""}`),
      ``,
      `BUSINESS FACTS (authoritative):`,
      ...ref.knowledge.map((k) => `- ${k.label}: ${k.content}`),
      ``,
      `ALLOWED INTERNAL LINK PATHS (use only these):`,
      links.join(", "),
    ]
      .filter((l) => l !== "")
      .join("\n");

    const draft = await callGateway([
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ]);

    const wordCount = draft.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;

    const { data: logRow } = await supabase
      .from("ai_generation_log")
      .insert({
        user_id: (context as any).userId,
        topic: data.topic.slice(0, 500),
        primary_keyword: data.primaryKeyword || null,
        word_count: wordCount,
      })
      .select("id")
      .single();

    return { draft, logId: logRow?.id ?? null, wordCount };
  });

export const saveBlogDraftAsPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        draft: draftSchema,
        primaryKeyword: z.string().max(120).optional().default(""),
        secondaryKeywords: z.array(z.string().max(120)).max(10).optional().default([]),
        logId: z.string().uuid().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    const d = data.draft;

    const faqParagraphs = d.faqs.length
      ? ["Frequently asked questions.", ...d.faqs.flatMap((f) => [`Q: ${f.question}`, f.answer])]
      : [];

    const { data: post, error } = await supabase
      .from("blog_posts")
      .insert({
        slug: d.slug,
        title: d.title,
        excerpt: d.excerpt,
        category: d.category,
        read_time: d.read_time,
        content: [...d.paragraphs, ...faqParagraphs],
        published: false,
        published_at: new Date().toISOString(),
        author_name: "AI draft",
        tags: [data.primaryKeyword, ...data.secondaryKeywords].filter(Boolean),
        seo_title: d.seo_title || null,
        meta_description: d.meta_description || null,
        primary_keyword: data.primaryKeyword || null,
        secondary_keywords: data.secondaryKeywords.length ? data.secondaryKeywords : null,
      })
      .select("id")
      .single();

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505")
        throw new Error("A post with this URL slug already exists. Change the slug and try again.");
      throw new Error(error.message);
    }

    if (data.logId) {
      await supabase.from("ai_generation_log").update({ post_id: post.id }).eq("id", data.logId);
    }
    return { id: post.id as string };
  });

export const listAiGenerationLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    const now = new Date();
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [rows, today, month] = await Promise.all([
      supabase
        .from("ai_generation_log")
        .select("id, topic, primary_keyword, word_count, post_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("ai_generation_log").select("id", { count: "exact", head: true }).gte("created_at", dayStart),
      supabase.from("ai_generation_log").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
    ]);

    return {
      entries: rows.data ?? [],
      today: today.count ?? 0,
      month: month.count ?? 0,
      dailyCap: DAILY_CAP,
      monthlyCap: MONTHLY_CAP,
    };
  });

// ---- Business knowledge ----

const knowledgeSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(2).max(120),
  content: z.string().min(2).max(2000),
  category: z.string().max(60).optional().default("general"),
  sort_order: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const listBusinessKnowledge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    const { data, error } = await supabase
      .from("business_knowledge")
      .select("id, label, content, category, sort_order, active")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveBusinessKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => knowledgeSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    const payload = {
      label: data.label,
      content: data.content,
      category: data.category,
      sort_order: data.sort_order,
      active: data.active,
      updated_at: new Date().toISOString(),
    };
    const { error } = data.id
      ? await supabase.from("business_knowledge").update(payload).eq("id", data.id)
      : await supabase.from("business_knowledge").insert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBusinessKnowledge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context as never as Ctx, "content.manage");
    const supabase = (context as any).supabase;
    const { error } = await supabase.from("business_knowledge").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
