// Translates published database content (tours, guides, FAQs, posts, destinations, categories)
// into a target locale and stores it in content_translations.
const locale = process.argv[2];
const NAMES = { pt: "European Portuguese (pt-PT)", es: "Spanish (Spain)" };
if (!NAMES[locale]) throw new Error("usage: node scripts/i18n-content.mjs pt|es");

const URL_BASE = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AI = process.env.LOVABLE_API_KEY;

const TRANSLATABLE = {
  tours: {
    text: ["title", "tagline", "description", "seo_title", "meta_description"],
    json: ["highlights", "included", "not_included", "itinerary"],
    filter: "published=eq.true",
  },
  blog_posts: {
    text: ["title", "excerpt", "seo_title", "meta_description"],
    json: ["content"],
    filter: "published=eq.true",
  },
  destinations: {
    text: ["name", "heading", "intro", "seo_title", "meta_description"],
    json: ["body_sections", "faqs"],
    filter: "published=eq.true",
  },
  faqs: { text: ["question", "answer"], json: [], filter: "" },
  travel_guides: {
    text: ["title", "excerpt", "quick_answer", "seo_title", "meta_description"],
    json: ["content"],
    filter: "status=eq.published",
  },
  travel_categories: { text: ["name", "description", "seo_title", "meta_description"], json: [], filter: "" },
};

async function rest(path, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE,
      authorization: `Bearer ${SERVICE}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function translateJson(payload) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${AI}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      messages: [
        {
          role: "system",
          content:
            `Translate the values of this JSON object into ${NAMES[locale]} for a family-run private tuk-tuk tour company in Lisbon. ` +
            "Keep every key exactly. Keep the same JSON structure, arrays and object keys inside values. " +
            "Never translate the brand name 'Tuk Tuk 24', prices, numbers, times, URLs, or HTML tags. Keep place names natural in the target language. " +
            "Do not invent, add or remove any information. Reply with JSON only in the shape {\"result\": <same structure>}.",
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`ai: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}").result ?? {};
}

for (const [table, spec] of Object.entries(TRANSLATABLE)) {
  const cols = ["id", ...spec.text, ...spec.json].join(",");
  const rows = await rest(`${table}?select=${cols}${spec.filter ? `&${spec.filter}` : ""}`);
  const done = await rest(
    `content_translations?select=record_id&table_name=eq.${table}&locale=eq.${locale}`,
  );
  const already = new Set((done ?? []).map((r) => r.record_id));
  console.error(`${table}: ${rows.length} rows (${already.size} already translated)`);

  for (const row of rows) {
    if (already.has(row.id)) continue;
    const payload = {};
    for (const f of [...spec.text, ...spec.json]) {
      const v = row[f];
      if (v == null || (typeof v === "string" && !v.trim())) continue;
      payload[f] = v;
    }
    if (Object.keys(payload).length === 0) continue;

    let translated;
    try {
      translated = await translateJson(payload);
    } catch (e) {
      console.error(`  ! ${table} ${row.id}: ${e.message}`);
      continue;
    }

    const records = [];
    for (const [field, value] of Object.entries(translated)) {
      if (value == null) continue;
      const isJson = spec.json.includes(field);
      records.push({
        table_name: table,
        record_id: row.id,
        field,
        locale,
        value: isJson ? JSON.stringify(value) : String(value),
        updated_at: new Date().toISOString(),
      });
    }
    if (!records.length) continue;
    await rest(`content_translations?on_conflict=table_name,record_id,field,locale`, {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(records),
    });
    console.error(`  ok ${table} ${row.id} (${records.length} fields)`);
  }
}
console.error("done", locale);
