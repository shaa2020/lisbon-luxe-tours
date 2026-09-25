import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";
import { buildLedger } from "./booking-ledger";

const tokenSchema = z.string().regex(/^[a-f0-9]{32,64}$/);
const passSchema = z.string().max(400);
const PASS_HOURS = 12;
const MAX_TRIES = 5;
const LOCK_MIN = 15;

function lisbonDay(offset = 0) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(
    new Date(Date.now() + offset * 86400000),
  );
}

async function nodeCrypto() {
  return await import("node:crypto");
}

async function hashPin(pin: string, salt: string) {
  const c = await nodeCrypto();
  // Worker runtime caps PBKDF2 at 100000 iterations.
  return c.pbkdf2Sync(pin, salt, 100000, 32, "sha256").toString("hex");
}

async function sign(payload: string) {
  const c = await nodeCrypto();
  const secret = process.env["GUIDE_SESSION_SECRET"];
  if (!secret) throw new Error("Guide app is not configured");
  return c.createHmac("sha256", secret).update(payload).digest("hex");
}

async function makePass(g: { id: string; pin_hash: string | null }) {
  const exp = Date.now() + PASS_HOURS * 3600000;
  const body = `${g.id}.${exp}`;
  const sig = await sign(`${body}.${(g.pin_hash || "").slice(0, 16)}`);
  return `${body}.${sig}`;
}

async function passOk(g: { id: string; pin_hash: string | null }, pass: string) {
  const [id, exp, sig] = pass.split(".");
  if (!id || !exp || !sig || id !== g.id || Number(exp) < Date.now() || !g.pin_hash) return false;
  const want = await sign(`${id}.${exp}.${g.pin_hash.slice(0, 16)}`);
  const c = await nodeCrypto();
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && c.timingSafeEqual(a, b);
}

type Guide = {
  id: string;
  name: string;
  status: string;
  pin_hash: string | null;
  pin_salt: string | null;
  pin_failed_count: number;
  pin_locked_until: string | null;
  access_paused: boolean;
};

async function guideByToken(admin: any, token: string): Promise<Guide | null> {
  const { data } = await admin
    .from("ops_staff")
    .select("id, name, status, pin_hash, pin_salt, pin_failed_count, pin_locked_until, access_paused")
    .eq("dispatch_token", token)
    .maybeSingle();
  if (!data || String(data.status).toLowerCase() === "inactive") return null;
  return data as Guide;
}

/** Link + PIN pass must both be valid; returns the guide or throws. */
async function authGuide(admin: any, token: string, pass: string) {
  const g = await guideByToken(admin, token);
  if (!g) throw new Error("This link is no longer active");
  if (g.access_paused) throw new Error("PAUSED");
  if (!(await passOk(g, pass))) throw new Error("LOCKED");
  await admin.from("ops_staff").update({ last_seen_at: new Date().toISOString() }).eq("id", g.id);
  return g;
}

async function ledgers(admin: any, list: any[]) {
  const ids = list.map((b) => b.id);
  const m = new Map<string, ReturnType<typeof buildLedger>>();
  if (!ids.length) return m;
  const [pay, ord] = await Promise.all([
    admin.from("booking_payments").select("booking_id, amount_cents, direction, order_id").in("booking_id", ids),
    admin.from("orders").select("booking_id, amount_total, payment_status").in("booking_id", ids),
  ]);
  for (const b of list) {
    m.set(
      b.id,
      buildLedger(
        b,
        (ord.data ?? []).filter((o: any) => o.booking_id === b.id),
        (pay.data ?? []).filter((p: any) => p.booking_id === b.id),
      ),
    );
  }
  return m;
}

/** Public: what the lock screen needs (no guest data). */
export const guideStatus = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: tokenSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const g = await guideByToken(supabaseAdmin, data.token);
    if (!g) return null;
    const lockedUntil = g.pin_locked_until && new Date(g.pin_locked_until) > new Date() ? g.pin_locked_until : null;
    return { name: String(g.name).split(" ")[0], hasPin: !!g.pin_hash, paused: g.access_paused, lockedUntil };
  });

/** Public: check the PIN and hand out a 12-hour pass. */
export const guideUnlock = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, pin: z.string().regex(/^\d{4}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const g = await guideByToken(supabaseAdmin, data.token);
    if (!g) return { ok: false as const, error: "This link is no longer active" };
    if (g.access_paused) return { ok: false as const, error: "Access paused — contact the office" };
    if (!g.pin_hash || !g.pin_salt) return { ok: false as const, error: "No PIN set yet — ask the office" };
    if (g.pin_locked_until && new Date(g.pin_locked_until) > new Date())
      return { ok: false as const, error: `Too many tries. Try again after ${new Date(g.pin_locked_until).toLocaleTimeString("en-GB", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" })}` };

    const c = await nodeCrypto();
    const got = Buffer.from(await hashPin(data.pin, g.pin_salt));
    const want = Buffer.from(g.pin_hash);
    const ok = got.length === want.length && c.timingSafeEqual(got, want);
    if (!ok) {
      const tries = (g.pin_failed_count || 0) + 1;
      const lock = tries >= MAX_TRIES;
      await supabaseAdmin
        .from("ops_staff")
        .update({
          pin_failed_count: lock ? 0 : tries,
          pin_locked_until: lock ? new Date(Date.now() + LOCK_MIN * 60000).toISOString() : null,
        })
        .eq("id", g.id);
      if (lock) {
        await supabaseAdmin.from("admin_audit_log").insert({
          actor: null, entity: "ops_staff", entity_id: g.id, action: "guide_pin_lockout",
          summary: `Guide app locked after ${MAX_TRIES} wrong PINs (${g.name})`,
        } as any);
        try {
          const { sendAdminPush } = await import("./push.server");
          await sendAdminPush(supabaseAdmin as never, {
            title: "Guide app locked",
            body: `${MAX_TRIES} wrong PINs on ${g.name}'s link. Locked for ${LOCK_MIN} min.`,
            url: "/admin/ops/team",
            tag: `pin-lock-${g.id}`,
          });
        } catch { /* alert only */ }
        return { ok: false as const, error: `Too many tries. Locked for ${LOCK_MIN} minutes.` };
      }
      return { ok: false as const, error: `Wrong PIN (${MAX_TRIES - tries} tries left)` };
    }
    await supabaseAdmin
      .from("ops_staff")
      .update({ pin_failed_count: 0, pin_locked_until: null, last_seen_at: new Date().toISOString() })
      .eq("id", g.id);
    return { ok: true as const, pass: await makePass(g) };
  });

const rangeEnum = z.enum(["today", "tomorrow", "week", "history"]);

/**
 * Notes are shown to guides, so remove anything about money or details that
 * are already displayed elsewhere on the card (time, meetup point).
 */
function guideSafeNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const drop = /(deposit|balance due|paid online|promo code|discount|€|eur\b|total|price|pickup fee|preferred time|meetup point)/i;
  const kept = String(notes)
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !drop.test(l));
  return kept.length ? kept.join("\n") : null;
}

/** Guide (link + PIN pass): tours for a range, plus earnings. */
export const getGuideRunSheet = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: tokenSchema, pass: passSchema, range: rangeEnum }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const guide = await authGuide(supabaseAdmin, data.token, data.pass);
    const today = lisbonDay(0);
    const [from, to] =
      data.range === "today" ? [today, today]
      : data.range === "tomorrow" ? [lisbonDay(1), lisbonDay(1)]
      : data.range === "week" ? [today, lisbonDay(7)]
      : [lisbonDay(-30), lisbonDay(-1)];

    let q = supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_reference, customer_name, phone, tour_title, tour_slug, travel_date, travel_time, guests, status, tour_status, payment_status, amount_total, total_estimate, refund_cents, option_duration_label, pickup_place_name, pickup_address, pickup_instructions, pickup_latitude, pickup_longitude, meetup_point_name, meetup_point_address, meetup_point_instructions, notes, guest_token",
      )
      .eq("guide_id", guide.id)
      .gte("travel_date", from)
      .lte("travel_date", to)
      .order("travel_date", { ascending: data.range !== "history" })
      .order("travel_time");
    const { data: rows, error: qErr } = await q;
    if (qErr) throw new Error("Could not load tours");
    const list = (rows ?? []).filter((b: any) => String(b.status).toLowerCase() !== "cancelled");
    const led = await ledgers(supabaseAdmin, list);

    // Route highlights / stops for the tours on this run sheet (reference only).
    const slugs = Array.from(new Set(list.map((b: any) => b.tour_slug).filter(Boolean)));
    const stopsBySlug = new Map<string, string[]>();
    if (slugs.length) {
      const { data: tourRows } = await supabaseAdmin
        .from("tours").select("slug, highlights, itinerary").in("slug", slugs as string[]);
      for (const t of (tourRows ?? []) as any[]) {
        const fromItinerary = Array.isArray(t.itinerary)
          ? t.itinerary.map((i: any) => [i?.time, i?.title].filter(Boolean).join(" · ")).filter(Boolean)
          : [];
        const fromHighlights = Array.isArray(t.highlights) ? t.highlights.map((h: any) => String(h)) : [];
        const stops = (fromItinerary.length ? fromItinerary : fromHighlights).slice(0, 12);
        if (stops.length) stopsBySlug.set(t.slug, stops);
      }
    }

    // Earnings and cash held
    const monthStart = `${today.slice(0, 7)}-01`;
    const [payRes, setRes, brandRes] = await Promise.all([
      supabaseAdmin
        .from("booking_payments")
        .select("amount_cents, method, direction, commission_cents, paid_at")
        .eq("guide_id", guide.id)
        .eq("direction", "payment"),
      supabaseAdmin.from("guide_settlements").select("amount_cents, direction").eq("guide_id", guide.id),
      supabaseAdmin.from("site_settings").select("contact_phone, whatsapp_phone, google_review_url").eq("id", true).maybeSingle(),
    ]);
    const pays = (payRes.data ?? []) as any[];
    const sum = (arr: any[], k = "amount_cents") => arr.reduce((s, r) => s + Number(r[k] || 0), 0);
    const todayPays = pays.filter((p) => String(p.paid_at).slice(0, 10) === today);
    const monthPays = pays.filter((p) => String(p.paid_at).slice(0, 10) >= monthStart);
    const allCash = sum(pays.filter((p) => p.method === "guide_cash"));
    const handedIn = sum(((setRes.data ?? []) as any[]).filter((s) => s.direction === "received"));
    const b = brandRes.data as any;

    return {
      guide: { name: String(guide.name).split(" ")[0], fullName: guide.name },
      today,
      office: { phone: b?.contact_phone || "+351922024690", whatsapp: b?.whatsapp_phone || "+351922024690" },
      reviewUrl: b?.google_review_url || "https://tuktuk24lisbon.com/reviews",
      earnings: {
        todayCash: sum(todayPays.filter((p) => p.method === "guide_cash")),
        todayCard: sum(todayPays.filter((p) => p.method === "guide_card")),
        monthCash: sum(monthPays.filter((p) => p.method === "guide_cash")),
        monthCard: sum(monthPays.filter((p) => p.method === "guide_card")),
        monthCommission: sum(monthPays, "commission_cents"),
        cashToHandIn: Math.max(0, allCash - handedIn),
      },
      tours: list.map((r: any) => {
        const l = led.get(r.id)!;
        return {
          id: r.id,
          ref: r.booking_reference,
          guest: r.customer_name,
          phone: r.phone,
          tour: r.tour_title,
          date: r.travel_date,
          time: r.travel_time,
          guests: r.guests,
          language: null as string | null,
          duration: r.option_duration_label,
          place: r.pickup_place_name || r.meetup_point_name || null,
          address: r.pickup_address || r.meetup_point_address || null,
          instructions: r.pickup_instructions || r.meetup_point_instructions || null,
          lat: r.pickup_latitude,
          lng: r.pickup_longitude,
          // Guides must never see tour prices, deposits or totals — strip any
          // money/admin lines from the notes and keep only real instructions.
          notes: guideSafeNotes(r.notes),
          rawStatus: String(r.tour_status || ""),
          stage: l.tourStage,
          due_cents: l.dueCents,
          stops: (r.tour_slug ? stopsBySlug.get(r.tour_slug) : null) ?? [],
          payUrl: `https://tuktuk24lisbon.com/booking/pay/${r.id}`,
          tripUrl: r.guest_token ? `https://tuktuk24lisbon.com/trip/${r.guest_token}` : null,
        };
      }),
    };
  });

async function ownBooking(admin: any, guide: Guide, id: string) {
  const { data: b } = await admin
    .from("bookings")
    .select("id, guide_id, booking_reference, status, tour_status, amount_total, total_estimate, refund_cents, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.guide_id !== guide.id) throw new Error("Tour not found");
  return b;
}

/** Guide: move a tour along (on my way / start / no-show / finish). */
export const guideTourAction = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: tokenSchema,
      pass: passSchema,
      bookingId: z.string().uuid(),
      action: z.enum(["onway", "start", "noshow", "finish"]),
      note: z.string().max(280).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const guide = await authGuide(supabaseAdmin, data.token, data.pass);
    const b = await ownBooking(supabaseAdmin, guide, data.bookingId);
    if (b.tour_status === "completed" || b.tour_status === "no_show") return { ok: true };
    const next = { onway: "on_the_way", start: "in_progress", noshow: "no_show", finish: "completed" }[data.action];
    const label = { onway: "Guide on the way", start: "Tour started", noshow: "Marked no-show", finish: "Tour finished" }[data.action];
    await supabaseAdmin.from("bookings").update({ tour_status: next }).eq("id", b.id);
    const { logEvent } = await import("./bookings-admin.server");
    await logEvent(supabaseAdmin, b.id, "status", `${label} — ${guide.name} (guide app)`, {} as any, null);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: null, entity: "booking", entity_id: b.id, action: `guide_${data.action}`,
      summary: `${label} by ${guide.name} via guide app`,
    } as any);
    return { ok: true };
  });

/** Guide: record cash or card money taken for a tour. Never more than owed. */
export const guideCollect = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: tokenSchema,
      pass: passSchema,
      bookingId: z.string().uuid(),
      method: z.enum(["cash", "card"]),
      amountCents: z.number().int().min(1).max(10000000),
      reference: z.string().max(60).optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const guide = await authGuide(supabaseAdmin, data.token, data.pass);
    const b = await ownBooking(supabaseAdmin, guide, data.bookingId);
    const due = (await ledgers(supabaseAdmin, [b])).get(b.id)!.dueCents;
    if (due <= 0) throw new Error("Nothing is owed on this tour");
    if (data.amountCents > due) throw new Error(`Only €${(due / 100).toFixed(2)} is owed`);

    const { data: settings } = await supabaseAdmin
      .from("site_settings").select("commission_rate_percent").eq("id", true).maybeSingle();
    const rate = Number(settings?.commission_rate_percent ?? 20);
    const method = data.method === "cash" ? "guide_cash" : "guide_card";
    const { error } = await supabaseAdmin.from("booking_payments").insert({
      booking_id: b.id,
      amount_cents: data.amountCents,
      direction: "payment",
      method,
      collected_by: guide.name,
      settlement_kind: "balance",
      reference: data.reference || null,
      notes: `Via guide app (${data.method})`,
      paid_at: new Date().toISOString(),
      guide_id: guide.id,
      commission_rate_percent: rate,
      commission_cents: Math.round((data.amountCents * rate) / 100),
    });
    if (error) throw new Error("Could not record the payment");
    const { syncBookingSettlement } = await import("./settlement.server");
    await syncBookingSettlement(supabaseAdmin, b.id);

    const euros = `€${(data.amountCents / 100).toFixed(2)}`;
    const summary = `${euros} ${data.method} collected by ${guide.name} via guide app`;
    const { logEvent } = await import("./bookings-admin.server");
    await logEvent(supabaseAdmin, b.id, "payment", summary, {} as any, null);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor: null, entity: "booking", entity_id: b.id, action: "guide_collect", summary,
    } as any);
    try {
      const { sendAdminPush } = await import("./push.server");
      await sendAdminPush(supabaseAdmin as never, {
        title: `${data.method === "cash" ? "Cash" : "Card"} collected · ${euros}`,
        body: `${b.booking_reference ?? ""} — by ${guide.name}`,
        url: "/admin/reconciliation",
        tag: `guide-pay-${b.id}-${Date.now()}`,
      });
    } catch { /* alert only */ }
    return { ok: true, remaining_cents: due - data.amountCents };
  });

/* ---------------- Admin ---------------- */

export const listGuideLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context as any, "ops.manage");
    const { data, error } = await context.supabase
      .from("ops_staff")
      .select("id, name, role, status, whatsapp, phone, dispatch_token, pin_hash, access_paused, last_seen_at, pin_locked_until")
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(({ pin_hash, ...r }: any) => ({ ...r, has_pin: !!pin_hash }));
  });

export const resetGuideLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ staffId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context as any, "ops.manage");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("ops_staff").update({ dispatch_token: token }).eq("id", data.staffId);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({
      actor: context.userId, action: "guide_link_reset", entity: "ops_staff", entity_id: data.staffId,
      summary: "Guide app link reset",
    } as any);
    return { token };
  });

export const setGuidePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ staffId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context as any, "ops.manage");
    const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("");
    const pin_hash = await hashPin(data.pin, salt);
    const { error } = await context.supabase
      .from("ops_staff")
      .update({ pin_hash, pin_salt: salt, pin_failed_count: 0, pin_locked_until: null })
      .eq("id", data.staffId);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({
      actor: context.userId, action: "guide_pin_set", entity: "ops_staff", entity_id: data.staffId,
      summary: "Guide app PIN set",
    } as any);
    return { ok: true };
  });

export const setGuidePaused = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ staffId: z.string().uuid(), paused: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context as any, "ops.manage");
    const { error } = await context.supabase
      .from("ops_staff").update({ access_paused: data.paused }).eq("id", data.staffId);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({
      actor: context.userId, action: data.paused ? "guide_access_paused" : "guide_access_resumed",
      entity: "ops_staff", entity_id: data.staffId,
      summary: data.paused ? "Guide app access paused" : "Guide app access resumed",
    } as any);
    return { ok: true };
  });
