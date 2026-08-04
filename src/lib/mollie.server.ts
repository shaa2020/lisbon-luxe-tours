import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MOLLIE_API = "https://api.mollie.com/v2";

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Online payments are temporarily unavailable while we update our booking system. Please send us your request and we will confirm by email or WhatsApp.";

export function getMollieKey(): string {
  return (
    process.env.MOLLIE_API_KEY ||
    process.env.MOLLIE_LIVE_API_KEY ||
    process.env.MOLLIE_TEST_API_KEY ||
    ""
  );
}

export async function mollieFetch(
  path: string,
  init?: { method?: string; body?: Record<string, unknown> },
) {
  const key = getMollieKey();
  if (!key) throw new Error("Mollie API key not configured");
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: init?.method || "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Mollie ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}

export function toMollieAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Whether we can take money online right now:
 * requires an API key AND the admin toggle to be on.
 */
export async function paymentsStatus(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from("site_settings")
    .select("payments_enabled, payments_maintenance_message")
    .eq("id", true)
    .maybeSingle();

  const message =
    (data as any)?.payments_maintenance_message?.trim() || DEFAULT_MAINTENANCE_MESSAGE;
  const toggledOn = (data as any)?.payments_enabled !== false;
  const hasKey = !!getMollieKey();

  return { available: toggledOn && hasKey, message };
}

export type MolliePayment = {
  id: string;
  status: string;
  checkoutUrl: string | null;
  metadata: Record<string, string> | null;
  amountCents: number;
};

function normalize(payment: any): MolliePayment {
  return {
    id: payment.id,
    status: payment.status,
    checkoutUrl: payment?._links?.checkout?.href ?? null,
    metadata: payment.metadata ?? null,
    amountCents: Math.round(Number(payment?.amount?.value || 0) * 100),
  };
}

export async function createMolliePayment(opts: {
  amountCents: number;
  description: string;
  origin: string;
  metadata: Record<string, string>;
  redirectPath?: string;
}): Promise<MolliePayment> {
  const isLocal = opts.origin.includes("localhost") || opts.origin.includes("127.0.0.1");
  const body: Record<string, unknown> = {
    amount: { currency: "EUR", value: toMollieAmount(opts.amountCents) },
    description: opts.description.slice(0, 255),
    redirectUrl: `${opts.origin}${opts.redirectPath || "/booking/success"}?session_id=`,
    metadata: opts.metadata,
  };
  // Mollie rejects localhost webhook URLs, so only send it for real hosts.
  if (!isLocal) body["webhookUrl"] = `${opts.origin}/api/public/payments/mollie`;

  const created = normalize(await mollieFetch("/payments", { method: "POST", body }));

  // Now that we know the id, point the redirect at our success page with it.
  const updated = normalize(
    await mollieFetch(`/payments/${created.id}`, {
      method: "PATCH",
      body: { redirectUrl: `${opts.origin}${opts.redirectPath || "/booking/success"}?session_id=${created.id}` },
    }),
  );

  return { ...updated, checkoutUrl: updated.checkoutUrl || created.checkoutUrl };
}

export async function getMolliePayment(id: string): Promise<MolliePayment> {
  return normalize(await mollieFetch(`/payments/${encodeURIComponent(id)}`));
}
