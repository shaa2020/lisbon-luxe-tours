import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { apiError, apiOk, preflight, withApi } from "@/lib/api/core.server";
import { normalizePhone, upsertCustomer } from "@/lib/api/data.server";

/**
 * Meta WhatsApp Cloud API webhook.
 * GET  = hub verification handshake (WHATSAPP_VERIFY_TOKEN)
 * POST = incoming messages, verified with X-Hub-Signature-256 (WHATSAPP_APP_SECRET)
 * Secrets live only in server env vars — never in the browser bundle.
 */

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    const a = Buffer.from(header.slice(7), "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

export const Route = createFileRoute("/api/v1/webhooks/whatsapp")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),

      // Meta verification handshake.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge") ?? "";
        const expected = process.env["WHATSAPP_VERIFY_TOKEN"];

        if (!expected) return new Response("Webhook not configured", { status: 503 });
        if (mode === "subscribe" && token === expected) {
          return new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } });
        }
        return new Response("Forbidden", { status: 403 });
      },

      POST: withApi({ scope: null, limit: 600 }, async ({ request }) => {
        const secret = process.env["WHATSAPP_APP_SECRET"];
        const raw = await request.text();

        if (!secret) {
          console.error("[whatsapp] WHATSAPP_APP_SECRET is not configured");
          return apiError(request, "server_error", "Webhook not configured", 503);
        }
        if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
          return apiError(request, "unauthorized", "Invalid signature", 401);
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return apiError(request, "validation_error", "Invalid JSON", 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let stored = 0;

        for (const entry of payload?.entry ?? []) {
          for (const change of entry?.changes ?? []) {
            const value = change?.value ?? {};
            const contactName: string | undefined = value?.contacts?.[0]?.profile?.name;
            for (const msg of (value?.messages ?? []) as WaMessage[]) {
              if (!msg.from) continue;
              const phone = normalizePhone(msg.from);

              const { customer } = await upsertCustomer({ name: contactName ?? null, phone });

              const { data: existing } = await supabaseAdmin
                .from("conversations")
                .select("id")
                .eq("phone", phone)
                .eq("channel", "whatsapp")
                .maybeSingle();

              let conversationId = existing?.id;
              if (!conversationId) {
                const { data: created, error } = await supabaseAdmin
                  .from("conversations")
                  .insert({
                    phone,
                    display_name: contactName ?? null,
                    channel: "whatsapp",
                    handled_by: "ai",
                    source: "whatsapp_cloud_api",
                    customer_id: (customer?.id as string) ?? null,
                    external_id: value?.metadata?.phone_number_id ?? null,
                  })
                  .select("id")
                  .single();
                if (error) throw new Error(error.message);
                conversationId = created.id;
              }

              const sentAt = msg.timestamp
                ? new Date(Number(msg.timestamp) * 1000).toISOString()
                : new Date().toISOString();

              // external_id is unique — replays from Meta are ignored.
              const { error: msgErr } = await supabaseAdmin.from("conversation_messages").insert({
                conversation_id: conversationId,
                sender: "customer",
                body: msg.text?.body ?? null,
                message_type: msg.type ?? "text",
                external_id: msg.id ?? null,
                sent_at: sentAt,
                metadata: { wa: msg },
              });
              if (!msgErr) stored += 1;

              await supabaseAdmin
                .from("conversations")
                .update({ last_message_at: sentAt, status: "open" })
                .eq("id", conversationId);
            }
          }
        }

        // Always 200 so Meta does not retry endlessly.
        return apiOk(request, { received: true, stored });
      }),
    },
  },
});
