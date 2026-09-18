import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Locale } from "./core";
import { TRANSLATABLE, type OverlayMap } from "./fields";

async function fetchOverlay(
  table: string,
  locale: Locale,
  ids: string[],
): Promise<OverlayMap> {
  const map: OverlayMap = new Map();
  if (locale === "en" || ids.length === 0) return map;

  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabaseAdmin
      .from("content_translations")
      .select("record_id, field, value")
      .eq("table_name", table)
      .eq("locale", locale)
      .in("record_id", ids.slice(i, i + CHUNK));
    if (error || !data) continue;
    for (const row of data) {
      let perRecord = map.get(row.record_id);
      if (!perRecord) {
        perRecord = new Map();
        map.set(row.record_id, perRecord);
      }
      perRecord.set(row.field, row.value);
    }
  }
  return map;
}

function applyValue(row: Record<string, unknown>, field: string, raw: string, isJson: boolean) {
  if (!isJson) {
    row[field] = raw;
    return;
  }
  try {
    row[field] = JSON.parse(raw);
  } catch {
    // malformed stored JSON — keep original value
  }
}

/**
 * Overlay translated content onto raw DB rows (mutates copies, returns new array).
 * Unknown/missing translations keep the original English value.
 */
export async function applyTranslations<T extends { id?: string }>(
  rows: T[],
  table: string,
  locale: Locale,
): Promise<T[]> {
  if (locale === "en" || rows.length === 0) return rows;
  const spec = TRANSLATABLE[table];
  if (!spec) return rows;

  const ids = rows.map((r) => r.id).filter((x): x is string => !!x);
  const overlay = await fetchOverlay(table, locale, ids);
  if (overlay.size === 0) return rows;

  return rows.map((row) => {
    const perRecord = row.id ? overlay.get(row.id) : undefined;
    if (!perRecord) return row;
    const next = { ...row } as Record<string, unknown>;
    for (const [field, value] of perRecord) {
      const isJson = spec.json.includes(field);
      const isText = spec.text.includes(field);
      if (isText || isJson) applyValue(next, field, value, isJson);
    }
    return next as T;
  });
}

export async function applyTranslationsSingle<T extends { id?: string }>(
  row: T | null,
  table: string,
  locale: Locale,
): Promise<T | null> {
  if (!row) return row;
  const [applied] = await applyTranslations([row], table, locale);
  return applied ?? row;
}
