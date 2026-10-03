import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";

/**
 * Lisbon cruise ship arrivals. The schedule is pulled on demand (admin presses
 * "Refresh") from CruiseDig's public Lisbon port page, and admins can add,
 * correct or remove calls by hand. Nothing runs in the background.
 */

export type CruiseCall = {
  id: string;
  ship_name: string;
  cruise_line: string | null;
  passengers: number | null;
  arrival_date: string;
  arrival_time: string | null;
  departure_date: string | null;
  departure_time: string | null;
  terminal: string | null;
  notes: string | null;
  source: string;
  synced_at: string | null;
};

const SOURCE_BASE = "https://cruisedig.com/ports/lisbon-portugal";
const MONTHS: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

type Parsed = { ship: string; line: string | null; pax: number | null; date: string; time: string | null };

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

export function parseSchedule(html: string): Parsed[] {
  const out: Parsed[] = [];
  const blocks = html.split('<div class="schedule">').slice(1);
  for (const b of blocks) {
    const ship = b.match(/class="name"><a[^>]*>([^<]+)<\/a>/)?.[1];
    const dt = b.match(/schedule__datetime">\s*(\d{2}) ([A-Za-z]{3}) (\d{4})/);
    if (!ship || !dt) continue;
    const month = MONTHS[dt[2]!];
    if (!month) continue;
    const occ = [...b.matchAll(/class="occupancy">([\s\S]*?)<\/div>/g)].map((m) => m[1]!);
    const lineRaw = occ.find((o) => o.includes("<a"));
    const line = lineRaw ? lineRaw.replace(/<[^>]+>/g, "") : null;
    const paxRaw = occ.find((o) => /passengers/.test(o));
    const pax = paxRaw ? Number(paxRaw.replace(/[^\d]/g, "")) || null : null;
    const time = b.match(/data-time="(\d{2}:\d{2})"/)?.[1] ?? null;
    out.push({
      ship: decode(ship),
      line: line ? decode(line) : null,
      pax,
      date: `${dt[3]}-${month}-${dt[1]}`,
      time,
    });
  }
  return out;
}

async function fetchPages(kind: "arrivals" | "departures", pages: number) {
  const all: Parsed[] = [];
  for (let p = 0; p < pages; p++) {
    const res = await fetch(`${SOURCE_BASE}/${kind}?page=${p}`, {
      headers: { "User-Agent": "Mozilla/5.0 (TukTuk24 admin schedule check)" },
    });
    if (!res.ok) {
      if (p === 0) throw new Error(`Cruise schedule source unavailable (${res.status})`);
      break;
    }
    const rows = parseSchedule(await res.text());
    if (!rows.length) break;
    all.push(...rows);
  }
  return all;
}

function lisbonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const listCruiseCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(1).max(60).default(14) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const from = lisbonToday();
    const to = addDays(from, data.days);
    const { data: rows, error } = await supabaseAdmin
      .from("cruise_arrivals")
      .select("*")
      .gte("arrival_date", from)
      .lte("arrival_date", to)
      .order("arrival_date")
      .order("arrival_time");
    if (error) throw new Error(error.message);
    const { data: last } = await supabaseAdmin
      .from("cruise_arrivals")
      .select("synced_at")
      .not("synced_at", "is", null)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { calls: (rows ?? []) as CruiseCall[], today: from, lastSync: last?.synced_at ?? null };
  });

export const refreshCruiseSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "manager");
    const [arrivals, departures] = await Promise.all([fetchPages("arrivals", 3), fetchPages("departures", 3)]);
    const today = lisbonToday();
    const horizon = addDays(today, 60);
    const now = new Date().toISOString();
    const rows = arrivals
      .filter((a) => a.date >= today && a.date <= horizon)
      .map((a) => {
        const dep = departures
          .filter((d) => d.ship === a.ship && d.date >= a.date)
          .sort((x, y) => (x.date + (x.time ?? "")).localeCompare(y.date + (y.time ?? "")))[0];
        return {
          ship_name: a.ship,
          cruise_line: a.line,
          passengers: a.pax,
          arrival_date: a.date,
          arrival_time: a.time,
          departure_date: dep?.date ?? null,
          departure_time: dep?.time ?? null,
          source: "cruisedig",
          synced_at: now,
        };
      });
    // Same ship can appear twice on one day in the source; keep the first.
    const seen = new Set<string>();
    const unique = rows.filter((r) => {
      const k = `${r.ship_name}|${r.arrival_date}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (!unique.length) throw new Error("No upcoming ships found in the published schedule");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Never overwrite a call an admin added or edited by hand.
    const { data: manual } = await supabaseAdmin
      .from("cruise_arrivals")
      .select("ship_name,arrival_date")
      .eq("source", "manual")
      .gte("arrival_date", today);
    const manualKeys = new Set((manual ?? []).map((m) => `${m.ship_name}|${m.arrival_date}`));
    const toSave = unique.filter((r) => !manualKeys.has(`${r.ship_name}|${r.arrival_date}`));
    const { error } = await supabaseAdmin
      .from("cruise_arrivals")
      .upsert(toSave, { onConflict: "ship_name,arrival_date" });
    if (error) throw new Error(error.message);
    return { saved: toSave.length };
  });

const callSchema = z.object({
  id: z.string().uuid().optional(),
  ship_name: z.string().trim().min(1).max(120),
  cruise_line: z.string().trim().max(120).nullable().optional(),
  passengers: z.number().int().min(0).max(20000).nullable().optional(),
  arrival_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  arrival_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  departure_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  terminal: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const saveCruiseCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => callSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const row = { ...rest, departure_date: rest.departure_time ? rest.arrival_date : null, source: "manual" };
    const q = id
      ? supabaseAdmin.from("cruise_arrivals").update(row).eq("id", id)
      : supabaseAdmin.from("cruise_arrivals").upsert(row, { onConflict: "ship_name,arrival_date" });
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCruiseCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "manager");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("cruise_arrivals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
