import type { GatewayMode } from "./payments.server";
import { loadAllGatewaySecrets } from "./gateway-secrets.server";

/**
 * PayPal client id for the browser SDK. Publishable by design — it is the only
 * PayPal credential that may leave the server.
 */
export async function paypalPublicClientId(mode: GatewayMode): Promise<string> {
  const bag = (await loadAllGatewaySecrets())[`paypal:${mode}`] ?? {};
  const fromDb = (bag["PAYPAL_CLIENT_ID"] || "").trim();
  if (fromDb) return fromDb;
  const fallback = mode === "test" ? process.env["PAYPAL_SANDBOX_CLIENT_ID"] : process.env["PAYPAL_CLIENT_ID"];
  return (fallback || "").trim();
}
