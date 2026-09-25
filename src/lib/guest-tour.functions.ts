import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";
import { buildLedger } from "./booking-ledger";

/** Public: a guest opens their private tour page with the secret link. */
export const getGuestTour = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().regex(/^[a-f0-9]{32,64}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, booking_reference, customer_name, tour_title, tour_slug, travel_date, travel_time, guests, status, tour_status, payment_status, amount_total, total_estimate, refund_cents, option_duration_label, pickup_type, pickup_place_name, pickup_address, pickup_instructions, pickup_latitude, pickup_longitude, meetup_point_name, meetup_point_address, meetup_point_instructions, guide_id, tip_cents",
      )
      .eq("guest_token", data.token)
      .maybeSingle();
    if (!b) return null;

    const [guideRes, tourRes, payRes, ordRes] = await Promise.all([
      b.guide_id
        ? supabaseAdmin
            .from("ops_staff")
            .select("name, phone, whatsapp, languages, photo_url, bio")
            .eq("id", b.guide_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      b.tour_slug
        ? supabaseAdmin.from("tours").select("image_url, duration").eq("slug", b.tour_slug).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("booking_payments").select("booking_id, amount_cents, direction, order_id").eq("booking_id", b.id),
      supabaseAdmin.from("orders").select("booking_id, amount_total, payment_status").eq("booking_id", b.id).neq("kind", "tip"),
    ]);

    // Real time the guide pressed "On my way" (from the booking history).
    const { data: onWayEv } = await supabaseAdmin
      .from("booking_events")
      .select("created_at")
      .eq("booking_id", b.id)
      .ilike("summary", "Guide on the way%")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const led = buildLedger(b as any, (ordRes.data ?? []) as any, (payRes.data ?? []) as any);
    const g = guideRes.data as any;
    const t = tourRes.data as any;
    const { guide_id: _g, ...safe } = b as any;
    return {
      ...safe,
      tour_image: t?.image_url ?? null,
      tour_duration: b.option_duration_label || t?.duration || null,
      total_cents: led.totalCents,
      paid_cents: led.paidCents,
      due_cents: led.dueCents,
      stage: led.tourStage,
      on_the_way_at: (onWayEv as any)?.created_at ?? null,
      tip_cents: Number((b as any).tip_cents || 0),
      guide: g
        ? {
            name: String(g.name || "").split(" ")[0],
            phone: g.whatsapp || g.phone || null,
            languages: g.languages ?? [],
            photo_url: g.photo_url ?? null,
            bio: g.bio ?? null,
          }
        : null,
    };
  });

/** Admin: get (or reset) the private guest link token for a booking. */
export const resetGuestToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ bookingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertPermission(context as any, "bookings.edit");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (x) => x.toString(16).padStart(2, "0")).join("");
    const { error } = await context.supabase.from("bookings").update({ guest_token: token }).eq("id", data.bookingId);
    if (error) throw new Error(error.message);
    await context.supabase.from("admin_audit_log").insert({
      actor: context.userId,
      action: "guest_link_reset",
      entity: "booking",
      entity_id: data.bookingId,
      summary: "Guest tour link reset",
    } as any);
    return { token };
  });
