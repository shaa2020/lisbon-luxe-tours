import { supabase } from "@/integrations/supabase/client";
import type { Locale } from "./core";
import { TRANSLATABLE, type OverlayMap } from "./fields";

/** Client-side overlay for ad-hoc supabase queries (e.g. FAQs) on localized pages. */
export async function fetchOverlay(
  table: string,
  locale: Locale,
  ids: string[],
): Promise<OverlayMap> {
  const map: OverlayMap = new Map();
  if (locale === "en" || ids.length === 0) return map;
  const { data, error } = await supabase
    .from("content_translations" as never)
    .select("record_id, field, value")
    .eq("table_name", table)
    .eq("locale", locale)
    .in("record_id", ids);
  if (error || !data) return map;
  for (const row of data as { record_id: string; field: string; value: string }[]) {
    let perRecord = map.get(row.record_id);
    if (!perRecord) {
      perRecord = new Map();
      map.set(row.record_id, perRecord);
    }
    perRecord.set(row.field, row.value);
  }
  return map;
}

/** Apply a fetched overlay to rows, mirroring the server-side rules. */
export function applyOverlay<T extends { id?: string }>(
  rows: T[],
  table: string,
  overlay: OverlayMap,
): T[] {
  if (overlay.size === 0) return rows;
  const spec = TRANSLATABLE[table];
  if (!spec) return rows;
  return rows.map((row) => {
    const perRecord = row.id ? overlay.get(row.id) : undefined;
    if (!perRecord) return row;
    const next = { ...row } as Record<string, unknown>;
    for (const [field, value] of perRecord) {
      const isJson = spec.json.includes(field);
      const isText = spec.text.includes(field);
      if (!isText && !isJson) continue;
      if (isJson) {
        try {
          next[field] = JSON.parse(value);
        } catch {
          /* keep original */
        }
      } else {
        next[field] = value;
      }
    }
    return next as T;
  });
}
