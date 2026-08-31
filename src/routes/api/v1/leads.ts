import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { normalizePhone, upsertCustomer } from "@/lib/api/data.server";

const leadSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
  whatsapp: z.string().trim().min(5).max(40).optional(),
  email: z.string().trim().email().max(200).optional(),
  language: z.string().trim().max(10).default("en"),
  number_of_people: z.number().int().min(1).max(60).optional(),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  preferred_time: z.string().trim().max(20).optional(),
  tour_id: z.string().uuid().optional(),
  tour_slug: z.string().trim().max(160).optional(),
  message: z.string().trim().max(4000).optional(),
  source: z.string().trim().max(60).default("api"),
  status: z.enum(["new", "contacted", "qualified", "won", "lost"]).default("new"),
  notes: z.string().trim().max(4000).optional(),
});

export const Route = createFileRoute("/api/v1/leads")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: withApi({ scope: "CREATE_LEAD" }, async ({ request, body }) => {
        const input = await body((v) => leadSchema.parse(v));
        const phone = input.phone ?? input.whatsapp;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let customerId: string | null = null;
        if (phone || input.email) {
          const { customer } = await upsertCustomer({
            name: input.name ?? null,
            phone: phone ?? null,
            email: input.email ?? null,
          });
          customerId = (customer?.id as string) ?? null;
        }

        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert({
            name: input.name ?? null,
            phone: phone ? normalizePhone(phone) : null,
            email: input.email?.toLowerCase() ?? null,
            language: input.language,
            number_of_people: input.number_of_people ?? null,
            preferred_date: input.preferred_date ?? null,
            preferred_time: input.preferred_time ?? null,
            tour_id: input.tour_id ?? null,
            tour_slug: input.tour_slug ?? null,
            message: input.message ?? null,
            source: input.source,
            status: input.status,
            notes: input.notes ?? null,
            customer_id: customerId,
          })
          .select("id, created_at, status")
          .single();

        if (error) throw new Error(error.message);
        return apiOk(request, { data: { ...data, customer_id: customerId } }, 201);
      }),
    },
  },
});
