import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GATEWAYS, type GatewayMode, type ProviderId } from "./payments.server";

const providerSchema = z.enum(["stripe", "mollie", "paypal", "manual"]);
const modeSchema = z.enum(["test", "live"]);

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

/** Which providers have server-side credentials configured, per mode. */
export const gatewayCredentialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const out: Record<string, { test: boolean; live: boolean }> = {};
    (Object.keys(GATEWAYS) as ProviderId[]).forEach((p) => {
      out[p] = {
        test: GATEWAYS[p].hasCredentials("test"),
        live: GATEWAYS[p].hasCredentials("live"),
      };
    });
    return out;
  });

/** Ping the provider API with the stored keys and persist the result. */
export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: ProviderId; mode: GatewayMode }) =>
    z.object({ provider: providerSchema, mode: modeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    let result: { ok: boolean; message: string };
    try {
      result = await GATEWAYS[data.provider].testConnection(data.mode);
    } catch (error) {
      result = { ok: false, message: (error as Error).message.slice(0, 300) };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("payment_gateways")
      .update({
        last_check_ok: result.ok,
        last_check_message: result.message,
        last_checked_at: new Date().toISOString(),
      })
      .eq("provider", data.provider);

    return result;
  });
