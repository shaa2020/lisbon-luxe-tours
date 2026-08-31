import { createFileRoute } from "@tanstack/react-router";
import { apiOk, notFound, preflight, withApi } from "@/lib/api/core.server";

export const Route = createFileRoute("/api/v1/conversations/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_CONVERSATIONS" }, async ({ request, params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const id = params["id"]!;
        const isUuid = /^[0-9a-f-]{36}$/i.test(id);

        const { data: conversation } = await supabaseAdmin
          .from("conversations")
          .select("*")
          .eq(isUuid ? "id" : "phone", isUuid ? id : decodeURIComponent(id))
          .maybeSingle();

        if (!conversation) notFound("Conversation not found");

        const { data: messages } = await supabaseAdmin
          .from("conversation_messages")
          .select("id, sender, body, message_type, language, sent_at, external_id")
          .eq("conversation_id", conversation.id)
          .order("sent_at", { ascending: true })
          .limit(200);

        return apiOk(request, { data: { ...conversation, messages: messages ?? [] } });
      }),
    },
  },
});
