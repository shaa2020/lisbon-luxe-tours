import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "./roles";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "bookings.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "qualified", "won", "lost"]),
        notes: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertPermission(context, "bookings.edit");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status, ...(data.notes !== undefined ? { notes: data.notes } : {}) })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "messages.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getConversationThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertPermission(context, "messages.view");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("conversation_messages")
      .select("id, sender, body, message_type, sent_at")
      .eq("conversation_id", data.id)
      .order("sent_at", { ascending: true })
      .limit(300);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
