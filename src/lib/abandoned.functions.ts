import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

export const ABANDONED_KIND = "abandoned_checkout";

const draftInput = z.object({
  /** Stable per-visit key so one visitor never creates a pile of rows. */
  draft_key: z.string().trim().min(8).max(120),
  tour_slug: z.string().trim().max(120),
  tour_title: z.string().trim().max(200).optional().nullable(),
  name: z.string().trim().max(200),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(50).optional().nullable(),
  travel_date: z.string().trim().max(20).optional().nullable(),
  travel_time: z.string().trim().max(10).optional().nullable(),
  guests: z.number().int().min(1).max(20).optional().nullable(),
  amount_cents: z.number().int().min(0).max(5_000_000).optional().nullable(),
  language: z.string().trim().max(10).optional().nullable(),
});

/**
 * Records an unfinished checkout so the owner can follow it up.
 * Public on purpose — it only ever writes a lead row the guest typed itself.
 */
export const captureCheckoutDraft = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => draftInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const amount = data.amount_cents ? `€${(data.amount_cents / 100).toFixed(2)}` : null;
    const row = {
      lead_kind: ABANDONED_KIND,
      source: "booking_form",
      source_url: data.draft_key,
      name: data.name || null,
      email: data.email,
      phone: data.phone || null,
      tour_slug: data.tour_slug || null,
      preferred_date: data.travel_date || null,
      preferred_time: data.travel_time || null,
      number_of_people: data.guests ?? null,
      language: data.language || "en",
      message: [data.tour_title, amount ? `Estimated total ${amount}` : null]
        .filter(Boolean)
        .join(" · ") || null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id, status")
      .eq("lead_kind", ABANDONED_KIND)
      .eq("source_url", data.draft_key)
      .maybeSingle();

    if (existing) {
      // Never resurrect something already handled or converted.
      if (existing.status === "won" || existing.status === "lost") return { ok: true as const };
      await supabaseAdmin.from("leads").update(row).eq("id", existing.id);
      return { ok: true as const };
    }

    await supabaseAdmin.from("leads").insert({ ...row, status: "new" });
    return { ok: true as const };
  });

export const listAbandonedCheckouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "bookings.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select(
        "id, name, email, phone, tour_slug, preferred_date, preferred_time, number_of_people, message, status, created_at, updated_at",
      )
      .eq("lead_kind", ABANDONED_KIND)
      .in("status", ["new", "contacted"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setAbandonedStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "won", "lost"]),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPermission(context, "bookings.edit");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("lead_kind", ABANDONED_KIND);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
