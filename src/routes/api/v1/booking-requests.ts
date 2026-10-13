import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, badRequest, preflight, withApi } from "@/lib/api/core.server";
import { normalizePhone, upsertCustomer } from "@/lib/api/data.server";

const schema = z.object({
  customer_name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(5).max(40),
  email: z.string().trim().email().max(200),
  tour_id: z.string().uuid().optional(),
  tour_slug: z.string().trim().max(160).optional(),
  tour_title: z.string().trim().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().trim().max(20).optional(),
  party_size: z.number().int().min(1).max(60),
  pickup_location: z.string().trim().max(300).optional(),
  duration_minutes: z.number().int().min(15).max(1440).optional(),
  amount_total: z.number().min(0).max(100000).optional(),
  language: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(4000).optional(),
  source: z.string().trim().max(60).default("api"),
});

export const Route = createFileRoute("/api/v1/booking-requests")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: withApi({ scope: "CREATE_BOOKING_REQUEST" }, async ({ request, body }) => {
        const input = await body((v) => schema.parse(v));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Resolve the tour from the live catalogue when possible.
        let tour: { id: string; slug: string; title: string } | null = null;
        if (input.tour_id || input.tour_slug) {
          const { data } = await supabaseAdmin
            .from("tours")
            .select("id, slug, title")
            .eq(input.tour_id ? "id" : "slug", (input.tour_id ?? input.tour_slug)!)
            .eq("published", true)
            .maybeSingle();
          tour = data ?? null;
        }

        await upsertCustomer({
          name: input.customer_name,
          phone: input.phone,
          email: input.email,
        });

        const notes = [
          "Booking REQUEST created via API — not confirmed until staff review.",
          input.time ? `Preferred time: ${input.time}` : null,
          input.pickup_location ? `Pickup: ${input.pickup_location}` : null,
          input.language ? `Language: ${input.language}` : null,
          `WhatsApp: ${normalizePhone(input.phone)}`,
          input.notes,
        ]
          .filter(Boolean)
          .join("\n");

        const { data, error } = await supabaseAdmin
          .from("bookings")
          .insert({
            tour_slug: tour?.slug ?? input.tour_slug ?? "api-request",
            tour_title: tour?.title ?? input.tour_title ?? "Booking request",
            customer_name: input.customer_name,
            email: input.email.toLowerCase(),
            phone: normalizePhone(input.phone),
            travel_date: input.date ?? null,
            travel_time: input.time ?? null,
            guests: input.party_size,
            option_duration_minutes: input.duration_minutes ?? null,
            amount_total: input.amount_total ?? null,
            notes,
            status: "new",
            payment_status: "request",
            source: input.source,
          })
          .select("id, status, payment_status, created_at")
          .single();

        if (error) throw new Error(error.message);

        await supabaseAdmin.from("booking_events").insert({
          booking_id: data.id,
          kind: "created",
          summary: `Booking request received via API (${input.source})`,
          detail: { source: input.source, party_size: input.party_size },
        });

        return apiOk(
          request,
          {
            data: {
              ...data,
              reference: String(data.id).slice(0, 8).toUpperCase(),
              confirmed: false,
            },
          },
          201,
        );
      }),
      // GET: list booking requests for external team tools (Tuktukconnect).
      GET: withApi({ scope: "CREATE_BOOKING_REQUEST" }, async ({ request, url }) => {
        const limitRaw = Number(url.searchParams.get("limit") ?? 50);
        const limit = Number.isFinite(limitRaw)
          ? Math.min(Math.max(Math.trunc(limitRaw), 1), 100)
          : 50;
        const status = url.searchParams.get("status");
        const since = url.searchParams.get("since");
        if (
          since &&
          !/^\d{4}-\d{2}-\d{2}(T[\d:.-]+(Z|[+-]\d{2}:?\d{2}))?$/.test(since)
        ) {
          badRequest("`since` must be an ISO date string (e.g. 2026-10-01 or 2026-10-01T00:00:00Z)");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let query = supabaseAdmin
          .from("bookings")
          .select(
            "id, tour_slug, tour_title, customer_name, email, phone, travel_date, travel_time, guests, notes, status, payment_status, source, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(limit);
        if (status) query = query.eq("status", status);
        if (since) query = query.gte("created_at", since);

        const { data: bookings, error } = await query;
        if (error) throw new Error(error.message);

        return apiOk(request, { data: bookings });
      }),
    },
  },
});
