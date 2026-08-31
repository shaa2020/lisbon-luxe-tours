import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { normalizePhone, upsertCustomer } from "@/lib/api/data.server";

const schema = z.object({
  phone: z.string().trim().min(5).max(40),
  display_name: z.string().trim().max(200).optional(),
  channel: z.enum(["whatsapp", "web", "email"]).default("whatsapp"),
  language: z.string().trim().max(10).default("en"),
  handled_by: z.enum(["ai", "human"]).default("ai"),
  source: z.string().trim().max(60).default("whatsapp_ai"),
  external_id: z.string().trim().max(200).optional(),
});

export const Route = createFileRoute("/api/v1/conversations/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: withApi({ scope: "WRITE_CONVERSATIONS" }, async ({ request, body }) => {
        const input = await body((v) => schema.parse(v));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const phone = normalizePhone(input.phone);

        const { customer } = await upsertCustomer({ name: input.display_name ?? null, phone });

        const { data: existing } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq("phone", phone)
          .eq("channel", input.channel)
          .maybeSingle();

        if (existing) return apiOk(request, { created: false, data: existing });

        const { data, error } = await supabaseAdmin
          .from("conversations")
          .insert({
            phone,
            display_name: input.display_name ?? null,
            channel: input.channel,
            language: input.language,
            handled_by: input.handled_by,
            source: input.source,
            external_id: input.external_id ?? null,
            customer_id: (customer?.id as string) ?? null,
          })
          .select("*")
          .single();

        if (error) throw new Error(error.message);
        return apiOk(request, { created: true, data }, 201);
      }),
    },
  },
});
