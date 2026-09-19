import { supabase } from "@/integrations/supabase/client";
import type { Locale } from "./core";
import { TRANSLATABLE } from "./fields";

/**
 * Browser-side twin of content.server.ts: overlays stored translations onto rows
 * fetched directly from the client (content_translations is publicly readable).
 * Missing translations keep the original English value.
 */
export async function applyClientTranslations<T extends { id?: string }>(
  rows: T[],
  table: string,
  locale: Locale,
): Promise<T[]> {
  if (locale === "en" || rows.length === 0) return rows;
  const spec = TRANSLATABLE[table];
  if (!spec) return rows;

  const ids = rows.map((r) => r.id).filter((x): x is string => !!x);
  if (ids.length === 0) return rows;

  const { data, error } = await supabase
    .from("content_translations" as never)
    .select("record_id, field, value")
    .eq("table_name", table)
    .eq("locale", locale)
    .in("record_id", ids);
  if (error || !data) return rows;

  const overlay = new Map<string, Map<string, string>>();
  for (const row of data as unknown as { record_id: string; field: string; value: string }[]) {
    let per = overlay.get(row.record_id);
    if (!per) {
      per = new Map();
      overlay.set(row.record_id, per);
    }
    per.set(row.field, row.value);
  }

  return rows.map((row) => {
    const per = row.id ? overlay.get(row.id) : undefined;
    if (!per) return row;
    const next = { ...row } as Record<string, unknown>;
    for (const [field, value] of per) {
      if (spec.json.includes(field)) {
        try {
          next[field] = JSON.parse(value);
        } catch {
          /* keep original */
        }
      } else if (spec.text.includes(field)) {
        next[field] = value;
      }
    }
    return next as T;
  });
}
