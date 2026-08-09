import { createServerFn } from "@tanstack/react-start";

/**
 * Public PayPal config for the on-site wallet buttons.
 * The client id is a publishable value — the secret never leaves the server.
 */
export const getPaypalPublicConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { paymentsStatus } = await import("./payments.server");
  const { paypalPublicClientId } = await import("./paypal-public.server");

  const status = await paymentsStatus(supabaseAdmin);
  if (!status.available || status.gateway.provider !== "paypal") {
    return { enabled: false, clientId: null as string | null, env: "test" as "test" | "live" };
  }
  const clientId = paypalPublicClientId(status.gateway.mode);
  return {
    enabled: !!clientId,
    clientId: clientId || null,
    env: status.gateway.mode === "live" ? ("live" as const) : ("test" as const),
  };
});
