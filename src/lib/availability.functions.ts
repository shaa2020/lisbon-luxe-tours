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
        phone: z.string().max(50).optional().nullable(),
        travel_date: z.string().max(20).optional().nullable(),
        time: z.string().max(20).optional().nullable(),
        guests: z.number().int().min(1).max(20),
        notes: z.string().max(2000).optional().nullable(),
        amount: z.number().int().min(0).max(500000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
        notes: [
          "Reserve now, pay later request (24h hold).",
          data.time ? `Preferred time: ${data.time}` : null,
          data.notes,
        ]
          .filter(Boolean)
          .join("\n\n"),
        total_estimate: Math.round(data.amount / 100),
        amount_total: data.amount,
        status: "new",
        payment_status: "request",
      })
      .select("id")
      .single();

    if (error || !booking) throw new Error(error?.message || "Could not save your request");

    return { booking_id: booking.id as string, reference: String(booking.id).slice(0, 8).toUpperCase() };
  });
