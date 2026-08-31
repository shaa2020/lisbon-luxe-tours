import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, notFound, preflight, withApi } from "@/lib/api/core.server";

const schema = z.object({
  sender: z.enum(["customer", "ai", "agent", "system"]).default("customer"),
  body: z.string().trim().max(8000).optional(),
  message_type: z.string().trim().max(40).default("text"),
  language: z.string().trim().max(10).optional(),
  external_id: z.string().trim().max(200).optional(),
  sent_at: z.string().datetime().optional(),
});

export const Route = createFileRoute("/api/v1/conversations/$id/messages")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: withApi({ scope: "WRITE_CONVERSATIONS" }, async ({ request, params, body }) => {
        const input = await body((v) => schema.parse(v));
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: conversation } = await supabaseAdmin
          .from("conversations")
          .select("id")
          .eq("id", params["id"]!)
          .maybeSingle();
        if (!conversation) notFound("Conversation not found");

        const sentAt = input.sent_at ?? new Date().toISOString();
        const { data, error } = await supabaseAdmin
          .from("conversation_messages")
          .insert({
            conversation_id: conversation.id,
            sender: input.sender,
            body: input.body ?? null,
            message_type: input.message_type,
            language: input.language ?? null,
            external_id: input.external_id ?? null,
            sent_at: sentAt,
          })
          .select("id, sender, body, message_type, sent_at")
          .single();

        if (error) throw new Error(error.message);

        await supabaseAdmin
          .from("conversations")
          .update({ last_message_at: sentAt })
          .eq("id", conversation.id);

        return apiOk(request, { data }, 201);
      }),
    },
  },
});
