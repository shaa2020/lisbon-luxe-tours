import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type AiItineraryItem = {
  time: string;
  title: string;
  detail: string;
  mandatory: boolean;
};

export type AiTourDraft = {
  title: string;
  slug: string;
  category_slug: string;
  duration: string;
  tagline: string;
  description: string;
  highlights: string[];
  itinerary: AiItineraryItem[];
  included: string[];
  not_included: string[];
};

const CATEGORY_SLUGS = [
  "tuk-tuk",
  "sintra",
  "belem",
  "cascais",
  "sunset",
  "airport",
  "custom",
] as const;

const draftSchema = z.object({
  title: z.string(),
  slug: z.string(),
  category_slug: z.enum(CATEGORY_SLUGS),
  duration: z.string(),
  tagline: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
  itinerary: z.array(
    z.object({
      time: z.string(),
      title: z.string(),
      detail: z.string(),
      mandatory: z.boolean(),
    }),
  ),
  included: z.array(z.string()),
  not_included: z.array(z.string()),
});

const jsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "slug",
    "category_slug",
    "duration",
    "tagline",
    "description",
    "highlights",
    "itinerary",
    "included",
    "not_included",
  ],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    category_slug: { type: "string", enum: [...CATEGORY_SLUGS] },
    duration: { type: "string" },
    tagline: { type: "string" },
    description: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    itinerary: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "title", "detail", "mandatory"],
        properties: {
          time: { type: "string" },
          title: { type: "string" },
          detail: { type: "string" },
          mandatory: { type: "boolean" },
        },
      },
    },
    included: { type: "array", items: { type: "string" } },
    not_included: { type: "array", items: { type: "string" } },
  },
} as const;

const SYSTEM = `You are a tour-content writer for a Lisbon tuk-tuk company.
You turn rough, informal, often misspelled admin notes into a complete tour listing.

STRICT RULES:
- Never invent attractions, stops or services that are not implied by the notes.
- Never invent or mention any price, discount or currency amount anywhere.
- Do not call the tour "private" unless the notes say private. Do not mention hotel pickup unless the notes say so.
- Natural, professional, SEO-friendly English for tourists. No exaggeration, no marketing fluff, no emojis.
- Correct misspelled Portuguese place names to their proper form (e.g. "se de lisboa" -> "Lisbon Cathedral (Sé de Lisboa)").
- category_slug must be one of: tuk-tuk, sintra, belem, cascais, sunset, airport, custom. Choose the best fit.
- duration: short human label like "1 Hour", "90 Minutes", "2 Hours" matching the notes.
- slug: lowercase, hyphenated, ascii only.
- highlights: one short line per stop or key feature, no numbering.
- itinerary: times are elapsed time from the start in HH:MM. The first item MUST be 00:00 titled "Start" and the last item MUST be exactly the total duration titled "End" (1 hour -> 01:00, 90 minutes -> 01:30, 2 hours -> 02:00). Distribute the stops realistically between them, allowing travel time; never exceed the total duration.
- mandatory: true only for stops the notes explicitly mark as mandatory/must-see/required.
- included / not_included: only items that are reasonable for this kind of tour and consistent with the notes.`;

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
        json_schema: { name: "tour_draft", strict: true, schema: jsonSchema },
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

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response. Try again.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned an unreadable response. Try again.");
  }
  return draftSchema.parse(parsed) as AiTourDraft;
}

type AdminCtx = {
  supabase: {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  userId: string;
};

async function assertAdmin(context: AdminCtx) {
  const { data } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
}

export const generateTourDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { notes: string; durationHint?: string }) =>
    z.object({ notes: z.string().min(5).max(8000), durationHint: z.string().max(60).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const hint = data.durationHint?.trim()
      ? `\n\nTotal tour duration (authoritative): ${data.durationHint.trim()}`
      : "";
    return callGateway([
      { role: "system", content: SYSTEM },
      { role: "user", content: `Admin notes:\n\n${data.notes}${hint}` },
    ]);
  });

export const reviseTourDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { draft: unknown; instruction: string }) =>
    z.object({ draft: draftSchema, instruction: z.string().min(2).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    return callGateway([
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `Here is the current tour draft as JSON:\n\n${JSON.stringify(data.draft, null, 2)}\n\nApply ONLY this change: "${data.instruction}"\n\nReturn the full draft JSON. Every field not affected by the requested change must stay byte-identical to the input.`,
      },
    ]);
  });
