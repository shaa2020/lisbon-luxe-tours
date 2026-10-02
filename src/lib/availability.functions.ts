import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

/**
 * Public availability lookup. Returns only aggregate counts — never customer data.
 */
export const getDayAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ date: z.string().min(8).max(10) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("daily_slot_capacity")
      .eq("id", true)
      .maybeSingle();
    const capacity = Math.max(1, settings?.daily_slot_capacity ?? 3);

    const { data: rows } = await supabaseAdmin
      .from("bookings")
      .select("travel_time, status")
      .eq("travel_date", data.date)
      .neq("status", "cancelled");

    const counts: Record<string, number> = {};
    for (const r of rows ?? []) {
      const t = (r.travel_time || "").slice(0, 5);
      if (!t) continue;
      counts[t] = (counts[t] ?? 0) + 1;
    }

    const slots = TIME_SLOTS.map((time) => {
      const booked = counts[time] ?? 0;
      return {
        time,
        left: Math.max(0, capacity - booked),
        full: booked >= capacity,
      };
    });

    return {
      date: data.date,
      capacity,
      slots,
      dayFull: slots.every((s) => s.full),
    };
  });

/**
 * "Reserve now, pay later" — creates a pending request without taking payment.
 */
export const requestBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        tour_slug: z.string().max(120),
        tour_title: z.string().min(1).max(200),
        customer_name: z.string().min(1).max(200),
        email: z.string().email().max(200),
        phone: z.string().trim().min(6).max(50),
        travel_date: z.string().max(20).optional().nullable(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid start time").optional().nullable(),
        guests: z.number().int().min(2).max(20),
        notes: z.string().max(2000).optional().nullable(),
        amount: z.number().int().min(0).max(500000),
        tour_option_id: z.string().uuid().optional().nullable(),
        tip_cents: z.number().int().min(0).max(100000).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertNotTooSoon, loadCutoffHours } = await import("./booking-cutoff");
    assertNotTooSoon(data.travel_date, data.time, await loadCutoffHours(supabaseAdmin));

    // Snapshot the chosen duration option so the request keeps its own prices.
    type OptionRow = {
      id: string;
      duration_label: string | null;
      duration_minutes: number | null;
      price: number | string | null;
      sale_price: number | string | null;
      badge: string | null;
      is_active: boolean | null;
    };
    let option: OptionRow | null = null;
    if (data.tour_option_id) {
      const { data: row } = await supabaseAdmin
        .from("tour_options")
        .select("id, duration_label, duration_minutes, price, sale_price, badge, is_active")
        .eq("id", data.tour_option_id)
        .maybeSingle();
      option = (row as unknown as OptionRow | null) ?? null;
      if (!option || option.is_active === false) {
        throw new Error("That duration option is no longer available. Please choose another.");
      }
    }
    const optBase = option ? Math.max(0, Number(option.price) || 0) : 0;
    const optSaleRaw = option?.sale_price == null ? null : Number(option.sale_price);
    const optSale = optSaleRaw != null && optSaleRaw > 0 && optSaleRaw < optBase ? optSaleRaw : null;

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_slug: data.tour_slug,
        tour_title: data.tour_title,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone ?? null,
        travel_date: data.travel_date || null,
        travel_time: data.time || null,
        guests: data.guests,
        tour_option_id: option?.id ?? null,
        option_label: option && option.badge && option.badge !== "none" ? option.badge : null,
        option_duration_label: option?.duration_label || null,
        option_duration_minutes: option ? Math.max(1, Math.round(Number(option.duration_minutes) || 60)) : null,
        option_base_price_cents: option ? Math.round(optBase * 100) : null,
        option_sale_price_cents: optSale == null ? null : Math.round(optSale * 100),
        option_price_cents: option ? Math.round((optSale ?? optBase) * 100) : null,
        notes: [
          "Reserve now, pay later request (24h hold).",
          data.time ? `Preferred time: ${data.time}` : null,
          option?.duration_label ? `Duration: ${option.duration_label}` : null,
          data.notes,
        ]
          .filter(Boolean)
          .join("\n\n"),
        total_estimate: Math.round(data.amount / 100),
        amount_total: data.amount,
        // Gratuity the guest chose while reserving; charged with the payment link,
        // never part of the fare, balance or commission.
        tip_cents: Math.max(0, Math.min(100000, Math.round(data.tip_cents ?? 0))),
        status: "new",
        payment_status: "request",
      })
      .select("id")
      .single();

    if (error || !booking) throw new Error(error?.message || "Could not save your request");

    return { booking_id: booking.id as string, reference: String(booking.id).slice(0, 8).toUpperCase() };
  });
