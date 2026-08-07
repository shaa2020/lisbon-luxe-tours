import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  GATEWAYS,
  GATEWAY_FIELDS,
  refreshGatewaySecretCache,
  type GatewayMode,
  type ProviderId,
} from "./payments.server";

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

/** Which providers have credentials configured, per mode, plus which fields are filled. */
export const gatewayCredentialStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const cache = await refreshGatewaySecretCache();

    const out: Record<
      string,
      { test: boolean; live: boolean; fields: { test: string[]; live: string[] } }
    > = {};
    (Object.keys(GATEWAYS) as ProviderId[]).forEach((p) => {
      out[p] = {
        test: GATEWAYS[p].hasCredentials("test"),
        live: GATEWAYS[p].hasCredentials("live"),
        fields: {
          test: Object.keys(cache[`${p}:test`] ?? {}),
          live: Object.keys(cache[`${p}:live`] ?? {}),
        },
      };
    });
    return out;
  });

/** Save (or clear) the API keys an admin typed in for a gateway + mode. */
export const saveGatewayKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: ProviderId; mode: GatewayMode; values: Record<string, string> }) =>
    z
      .object({
        provider: providerSchema,
        mode: modeSchema,
        values: z.record(z.string(), z.string()),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);

    const allowed = new Set((GATEWAY_FIELDS[data.provider] ?? []).map((f) => f.key));
    const values: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.values)) if (allowed.has(k)) values[k] = v;

    const { saveGatewaySecrets } = await import("./gateway-secrets.server");
    const saved = await saveGatewaySecrets(data.provider, data.mode, values);
    await refreshGatewaySecretCache();
    return { saved };
  });

/** Delete every saved key for a gateway + mode. */
export const clearGatewayKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: ProviderId; mode: GatewayMode }) =>
    z.object({ provider: providerSchema, mode: modeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { clearGatewaySecrets } = await import("./gateway-secrets.server");
    await clearGatewaySecrets(data.provider, data.mode);
    await refreshGatewaySecretCache();
    return { ok: true };
  });

/** Ping the provider API with the stored keys and persist the result. */
export const testGatewayConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provider: ProviderId; mode: GatewayMode }) =>
    z.object({ provider: providerSchema, mode: modeSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    await refreshGatewaySecretCache();

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
