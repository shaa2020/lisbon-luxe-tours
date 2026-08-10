import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

const customerSchema = z.object({
  name: z.string().min(1).max(200),
  whatsapp: z.string().max(50).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

const bookingPayloadSchema = z.object({
  customer: customerSchema,
  tour_name: z.string().min(1).max(200),
  tour_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().max(20).optional().nullable(),
  duration_hours: z.number().int().min(1).max(24).optional().nullable(),
  adults: z.number().int().min(1).max(50).optional().nullable(),
  children: z.number().int().min(0).max(50).optional().nullable(),
  vehicle_qty: z.number().int().min(1).max(20).optional().nullable(),
  vehicle_type: z.string().max(100).optional().nullable(),
  pickup_location: z.string().max(300).optional().nullable(),
  dropoff_location: z.string().max(300).optional().nullable(),
  base_price: z.number().min(0).max(100000).optional().nullable(),
  total: z.number().min(0).max(100000).optional().nullable(),
  currency: z.string().max(3).optional().nullable(),
  special_requests: z.string().max(2000).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
});

function generateReference(date: string) {
  const d = date.replace(/-/g, "").slice(2);
  const n = Math.floor(100 + Math.random() * 900);
  return `TT24-${d}-${n}`;
}

function apiKeyMatches(provided: string, expected: string) {
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/bookings")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const expectedKey = process.env["BOOKING_API_KEY"];
        if (!expectedKey) {
          console.error("BOOKING_API_KEY is not configured");
          return Response.json(
            { ok: false, error: "Server misconfiguration" },
            { status: 500, headers: CORS_HEADERS },
          );
        }

        const providedKey = request.headers.get("x-api-key") || "";
        if (!providedKey || !apiKeyMatches(providedKey, expectedKey)) {
          return Response.json(
            { ok: false, error: "Unauthorized" },
            { status: 401, headers: CORS_HEADERS },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "Invalid JSON" },
            { status: 400, headers: CORS_HEADERS },
          );
        }

        const parsed = bookingPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Validation failed", issues: parsed.error.issues },
            { status: 400, headers: CORS_HEADERS },
          );
        }

        const data = parsed.data;
        const guests = (data.adults ?? 1) + (data.children ?? 0);
        const total = data.total ?? data.base_price ?? 0;

        const notesLines = [
          data.start_time ? `Preferred time: ${data.start_time}` : null,
          data.duration_hours ? `Duration: ${data.duration_hours}h` : null,
          data.vehicle_qty ? `Vehicles: ${data.vehicle_qty}` : null,
          data.vehicle_type ? `Vehicle type: ${data.vehicle_type}` : null,
          data.pickup_location ? `Pickup: ${data.pickup_location}` : null,
          data.dropoff_location ? `Drop-off: ${data.dropoff_location}` : null,
          data.customer.whatsapp ? `WhatsApp: ${data.customer.whatsapp}` : null,
          data.customer.country ? `Country: ${data.customer.country}` : null,
          data.special_requests ? `Special requests: ${data.special_requests}` : null,
          data.source ? `Source: ${data.source}` : "Source: External Website",
        ].filter(Boolean);

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const { data: booking, error } = await supabaseAdmin
            .from("bookings")
            .insert({
              tour_slug: "external",
              tour_title: data.tour_name,
              customer_name: data.customer.name,
              email: data.customer.email || "external@tuktuk24lisbon.com",
              phone: data.customer.whatsapp || null,
              travel_date: data.tour_date,
              travel_time: data.start_time || null,
              guests,
              notes: notesLines.join("\n\n") || null,
              total_estimate: total,
              amount_total: Math.round(total * 100),
              status: "new",
              payment_status: "request",
            })
            .select("id")
            .single();

          if (error || !booking) {
            console.error("Booking insert error:", error);
            return Response.json(
              { ok: false, error: error?.message || "Booking insert failed" },
              { status: 500 },
            );
          }

          const reference = generateReference(data.tour_date);
          await supabaseAdmin
            .from("bookings")
            .update({ notes: `${notesLines.join("\n\n")}\n\nReference: ${reference}` })
            .eq("id", booking.id);

          return Response.json({
            ok: true,
            reference,
            id: booking.id,
          });
        } catch (e) {
          console.error("Unexpected booking API error:", e);
          return Response.json(
            { ok: false, error: (e as Error).message || "Internal error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
