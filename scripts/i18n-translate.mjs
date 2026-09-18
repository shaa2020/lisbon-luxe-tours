// Translates the extracted English UI copy into a target language and writes src/lib/i18n/auto.<locale>.ts
import { readFileSync, writeFileSync } from "node:fs";

const locale = process.argv[2];
const NAMES = { pt: "European Portuguese (pt-PT)", es: "Spanish (Spain)" };
if (!NAMES[locale]) throw new Error("usage: node scripts/i18n-translate.mjs pt|es");

const strings = JSON.parse(readFileSync("/tmp/strings.json", "utf8"));
const existingPath = `src/lib/i18n/auto.${locale}.ts`;
let existing = {};
try {
  const src = readFileSync(existingPath, "utf8");
  const start = src.indexOf("{");
  const end = src.lastIndexOf("}");
  if (start > -1 && end > start) existing = eval(`(${src.slice(start, end + 1)})`);
} catch {
  /* first run */
}

const todo = strings.filter((s) => !existing[s]);
const KEY = process.env.LOVABLE_API_KEY;
const out = { ...existing };
const BATCH = 40;

for (let i = 0; i < todo.length; i += BATCH) {
  const batch = todo.slice(i, i + BATCH);
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      messages: [
        {
          role: "system",
          content:
            `You translate website UI copy into ${NAMES[locale]} for a family-run private tuk-tuk tour company in Lisbon. ` +
            "Keep the brand name 'Tuk Tuk 24', place names (Lisbon->Lisboa where natural in Portuguese/Spanish, Alfama, Belém, Sintra, Cascais, Cabo da Roca), prices, numbers, emoji, arrows (→) and punctuation. " +
            "Keep the tone warm, natural and professional — never literal machine wording. Preserve capitalisation style (ALL CAPS stays ALL CAPS). Do not add or remove information. " +
            'Reply with JSON only: {"translations": {"<source>": "<translation>"}} containing every source string exactly as given as the key.',
        },
        { role: "user", content: JSON.stringify(batch) },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    console.error("batch failed", i, res.status, (await res.text()).slice(0, 300));
    continue;
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(content).translations ?? {};
  } catch {
    console.error("unparsable batch", i);
    continue;
  }
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v === "string" && v.trim() && strings.includes(k)) out[k] = v.trim();
  }
  console.error(`batch ${i / BATCH + 1}/${Math.ceil(todo.length / BATCH)} -> ${Object.keys(out).length}`);
}

const name = locale.toUpperCase();
const body = Object.keys(out)
  .sort()
  .map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(out[k])},`)
  .join("\n");
writeFileSync(
  existingPath,
  `/** Generated ${NAMES[locale]} UI copy. Regenerate with: node scripts/i18n-extract.mjs > /tmp/strings.json && node scripts/i18n-translate.mjs ${locale} */\nexport const AUTO_${name}: Record<string, string> = {\n${body}\n};\n`,
);
console.error("wrote", existingPath, Object.keys(out).length);
