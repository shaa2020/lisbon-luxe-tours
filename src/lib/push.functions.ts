import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRole } from "./roles";

/** Public VAPID key the browser needs to subscribe this device. */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(10).max(500),
  auth: z.string().min(4).max(300),
  user_agent: z.string().max(400).nullable().optional(),
  label: z.string().max(120).nullable().optional(),
});

/** Pairs the current device so it can receive lock-screen alerts. */
export const savePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        user_email: (context.claims as { email?: string } | null)?.email ?? null,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent ?? null,
        label: data.label ?? null,
        enabled: true,
        last_error: null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Unpairs a device (the admin turned alerts off on that phone). */
export const removePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ endpoint: z.string().url().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Devices paired by the signed-in admin. */
export const listMyPushDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, label, user_agent, last_sent_at, last_error, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return { devices: data ?? [] };
  });

/** Fires a test alert to the signed-in admin's own devices. */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertRole(context, "staff");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendAdminPush } = await import("./push.server");
    const result = await sendAdminPush(
      supabaseAdmin as never,
      {
        title: "TukTuk24 — test alert",
        body: "Notifications are working on this device.",
        url: "/admin",
        tag: "test",
      },
      { userId: context.userId },
    );
    return result;
  });
