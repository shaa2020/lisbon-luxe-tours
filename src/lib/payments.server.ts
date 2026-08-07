import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type ProviderId = "stripe" | "mollie" | "paypal" | "manual";

export type GatewayMode = "test" | "live";

export type PaymentResult = {
  id: string;
  status: string;
  checkoutUrl: string | null;
  metadata: Record<string, string> | null;
  amountCents: number;
};

export type CreatePaymentInput = {
  amountCents: number;
  description: string;
  origin: string;
  metadata: Record<string, string>;
  redirectPath?: string;
};

export type GatewayAdapter = {
  id: ProviderId;
  /** Whether the credentials this gateway needs are present on the server. */
  hasCredentials: (mode: GatewayMode) => boolean;
  createPayment: (input: CreatePaymentInput, mode: GatewayMode) => Promise<PaymentResult>;
  getPayment: (id: string) => Promise<PaymentResult>;
  testConnection: (mode: GatewayMode) => Promise<{ ok: boolean; message: string }>;
  /** Used to route a payment reference back to the gateway that created it. */
  ownsReference: (id: string) => boolean;
};

export const DEFAULT_MAINTENANCE_MESSAGE =
  "Online payments are temporarily unavailable while we update our booking system. Please send us your request and we will confirm by email or WhatsApp.";

const env = (key: string): string => process.env[key] || "";

/* ------------------------------------------------------------------ Mollie */

const MOLLIE_API = "https://api.mollie.com/v2";

function mollieKey(): string {
  return env("MOLLIE_API_KEY") || env("MOLLIE_LIVE_API_KEY") || env("MOLLIE_TEST_API_KEY");
}

async function mollieFetch(path: string, init?: { method?: string; body?: Record<string, unknown> }) {
  const key = mollieKey();
  if (!key) throw new Error("Mollie API key not configured");
  const res = await fetch(`${MOLLIE_API}${path}`, {
    method: init?.method || "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mollie ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function normalizeMollie(payment: any): PaymentResult {
  return {
    id: payment.id,
    status: payment.status,
    checkoutUrl: payment?._links?.checkout?.href ?? null,
    metadata: payment.metadata ?? null,
    amountCents: Math.round(Number(payment?.amount?.value || 0) * 100),
  };
}

const mollieAdapter: GatewayAdapter = {
  id: "mollie",
  hasCredentials: () => !!mollieKey(),
  ownsReference: (id) => id.startsWith("tr_"),
  async createPayment(input) {
    const isLocal = input.origin.includes("localhost") || input.origin.includes("127.0.0.1");
    const redirectPath = input.redirectPath || "/booking/success";
    const body: Record<string, unknown> = {
      amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) },
      description: input.description.slice(0, 255),
      redirectUrl: `${input.origin}${redirectPath}?session_id=`,
      metadata: input.metadata,
    };
    if (!isLocal) body["webhookUrl"] = `${input.origin}/api/public/payments/mollie`;

    const created = normalizeMollie(await mollieFetch("/payments", { method: "POST", body }));
    const updated = normalizeMollie(
      await mollieFetch(`/payments/${created.id}`, {
        method: "PATCH",
        body: { redirectUrl: `${input.origin}${redirectPath}?session_id=${created.id}` },
      }),
    );
    return { ...updated, checkoutUrl: updated.checkoutUrl || created.checkoutUrl };
  },
  async getPayment(id) {
    return normalizeMollie(await mollieFetch(`/payments/${encodeURIComponent(id)}`));
  },
  async testConnection() {
    if (!mollieKey()) return { ok: false, message: "No Mollie API key saved yet." };
    try {
      const me = await mollieFetch("/methods?limit=5");
      const count = me?.count ?? me?._embedded?.methods?.length ?? 0;
      return { ok: true, message: `Connected. ${count} payment method(s) enabled on your Mollie account.` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};

/* ------------------------------------------------------------------ Stripe */

const STRIPE_GATEWAY = "https://connector-gateway.lovable.dev/stripe";

function stripeKey(mode: GatewayMode): string {
  return mode === "live" ? env("STRIPE_LIVE_API_KEY") : env("STRIPE_SANDBOX_API_KEY");
}

async function stripeFetch(
  path: string,
  mode: GatewayMode,
  init?: { method?: string; form?: Record<string, string> },
) {
  const key = stripeKey(mode);
  const lovableKey = env("LOVABLE_API_KEY");
  if (!key) throw new Error(`Stripe ${mode} key not configured`);
  const res = await fetch(`${STRIPE_GATEWAY}${path}`, {
    method: init?.method || "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Connection-Api-Key": key,
      "Lovable-API-Key": lovableKey,
    },
    body: init?.form ? new URLSearchParams(init.form).toString() : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

function normalizeStripe(session: any): PaymentResult {
  const metadata: Record<string, string> = {};
  for (const [k, v] of Object.entries(session?.metadata ?? {})) metadata[k] = String(v);
  return {
    id: session.id,
    status: session.payment_status === "paid" ? "paid" : session.status === "expired" ? "expired" : "open",
    checkoutUrl: session.url ?? null,
    metadata,
    amountCents: Number(session.amount_total || 0),
  };
}

const stripeAdapter: GatewayAdapter = {
  id: "stripe",
  hasCredentials: (mode) => !!stripeKey(mode) && !!env("LOVABLE_API_KEY"),
  ownsReference: (id) => id.startsWith("cs_"),
  async createPayment(input, mode) {
    const redirectPath = input.redirectPath || "/booking/success";
    const form: Record<string, string> = {
      mode: "payment",
      success_url: `${input.origin}${redirectPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${input.origin}/booking/cancelled`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(input.amountCents),
      "line_items[0][price_data][product_data][name]": input.description.slice(0, 250),
      "payment_intent_data[description]": input.description.slice(0, 250),
    };
    for (const [k, v] of Object.entries(input.metadata)) form[`metadata[${k}]`] = String(v);
    return normalizeStripe(await stripeFetch("/v1/checkout/sessions", mode, { method: "POST", form }));
  },
  async getPayment(id) {
    const mode: GatewayMode = env("STRIPE_LIVE_API_KEY") ? "live" : "test";
    try {
      return normalizeStripe(await stripeFetch(`/v1/checkout/sessions/${encodeURIComponent(id)}`, mode));
    } catch {
      const other: GatewayMode = mode === "live" ? "test" : "live";
      return normalizeStripe(await stripeFetch(`/v1/checkout/sessions/${encodeURIComponent(id)}`, other));
    }
  },
  async testConnection(mode) {
    if (!stripeKey(mode)) {
      return {
        ok: false,
        message:
          mode === "live"
            ? "Live Stripe is not provisioned yet — finish go-live to accept real payments."
            : "Stripe sandbox key is missing.",
      };
    }
    try {
      await stripeFetch("/v1/balance", mode);
      return { ok: true, message: `Connected to Stripe (${mode === "live" ? "live" : "test"} mode).` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};

/* ------------------------------------------------------------------ PayPal */

function paypalBase(mode: GatewayMode) {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function paypalCreds(mode: GatewayMode) {
  const id = mode === "live" ? env("PAYPAL_CLIENT_ID") : env("PAYPAL_SANDBOX_CLIENT_ID") || env("PAYPAL_CLIENT_ID");
  const secret = mode === "live" ? env("PAYPAL_SECRET") : env("PAYPAL_SANDBOX_SECRET") || env("PAYPAL_SECRET");
  return { id, secret };
}

async function paypalToken(mode: GatewayMode) {
  const { id, secret } = paypalCreds(mode);
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${paypalBase(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string };
  if (!res.ok || !json.access_token) throw new Error(json.error_description || "PayPal auth failed");
  return json.access_token;
}

function normalizePaypal(order: any): PaymentResult {
  const approve = (order?.links ?? []).find((l: any) => l.rel === "approve" || l.rel === "payer-action");
  const unit = order?.purchase_units?.[0];
  const metadata: Record<string, string> = {};
  try {
    Object.assign(metadata, JSON.parse(unit?.custom_id || "{}"));
  } catch {
    /* no metadata */
  }
  return {
    id: order.id,
    status: order.status === "COMPLETED" || order.status === "APPROVED" ? "paid" : String(order.status || "open").toLowerCase(),
    checkoutUrl: approve?.href ?? null,
    metadata,
    amountCents: Math.round(Number(unit?.amount?.value || 0) * 100),
  };
}

const paypalAdapter: GatewayAdapter = {
  id: "paypal",
  hasCredentials: (mode) => {
    const { id, secret } = paypalCreds(mode);
    return !!id && !!secret;
  },
  ownsReference: (id) => /^[0-9A-Z]{17}$/.test(id),
  async createPayment(input, mode) {
    const token = await paypalToken(mode);
    const redirectPath = input.redirectPath || "/booking/success";
    const res = await fetch(`${paypalBase(mode)}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: input.description.slice(0, 127),
            custom_id: JSON.stringify(input.metadata).slice(0, 127),
            amount: { currency_code: "EUR", value: (input.amountCents / 100).toFixed(2) },
          },
        ],
        application_context: {
          return_url: `${input.origin}${redirectPath}`,
          cancel_url: `${input.origin}/booking/cancelled`,
        },
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 300));
    return normalizePaypal(json);
  },
  async getPayment(id) {
    const mode: GatewayMode = paypalCreds("live").id ? "live" : "test";
    const token = await paypalToken(mode);
    const res = await fetch(`${paypalBase(mode)}/v2/checkout/orders/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(json).slice(0, 300));

    // PayPal only moves money once the approved order is captured.
    if (json?.status === "APPROVED") {
      const cap = await fetch(`${paypalBase(mode)}/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const capJson = await cap.json();
      if (cap.ok) return normalizePaypal(capJson);
    }

    return normalizePaypal(json);
  },
  async testConnection(mode) {
    const { id, secret } = paypalCreds(mode);
    if (!id || !secret) return { ok: false, message: "PayPal client ID and secret are not saved yet." };
    try {
      await paypalToken(mode);
      return { ok: true, message: `Connected to PayPal (${mode} mode).` };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};

/* ------------------------------------------------------------------ Manual */

const manualAdapter: GatewayAdapter = {
  id: "manual",
  hasCredentials: () => true,
  ownsReference: () => false,
  async createPayment() {
    throw new Error("Manual mode does not take online payments");
  },
  async getPayment() {
    throw new Error("Manual mode does not take online payments");
  },
  async testConnection() {
    return { ok: true, message: "Manual mode needs no setup — requests go straight to your bookings list." };
  },
};

/* -------------------------------------------------------------- Registry */

export const GATEWAYS: Record<ProviderId, GatewayAdapter> = {
  stripe: stripeAdapter,
  mollie: mollieAdapter,
  paypal: paypalAdapter,
  manual: manualAdapter,
};

export type ActiveGateway = {
  provider: ProviderId;
  mode: GatewayMode;
  adapter: GatewayAdapter;
  installed: boolean;
};

export async function getActiveGateway(
  supabase: SupabaseClient<Database>,
): Promise<ActiveGateway> {
  const { data } = await supabase
    .from("payment_gateways")
    .select("provider, mode, installed")
    .eq("is_active", true)
    .maybeSingle();

  const provider = ((data?.provider as ProviderId) || "manual") as ProviderId;
  const adapter = GATEWAYS[provider] ?? manualAdapter;
  return {
    provider,
    mode: (data?.mode as GatewayMode) || "live",
    adapter,
    installed: data?.installed ?? false,
  };
}

/**
 * Whether we can take money online right now: an installed, credentialled
 * gateway is active AND the admin maintenance toggle is off.
 */
export async function paymentsStatus(supabase: SupabaseClient<Database>) {
  const { data } = await supabase
    .from("site_settings")
    .select("payments_enabled, payments_maintenance_message")
    .eq("id", true)
    .maybeSingle();

  const message =
    (data as { payments_maintenance_message?: string } | null)?.payments_maintenance_message?.trim() ||
    DEFAULT_MAINTENANCE_MESSAGE;
  const toggledOn = (data as { payments_enabled?: boolean } | null)?.payments_enabled !== false;

  const gateway = await getActiveGateway(supabase);
  const usable =
    gateway.provider !== "manual" &&
    gateway.installed &&
    gateway.adapter.hasCredentials(gateway.mode);

  return { available: toggledOn && usable, message, gateway };
}

/** Create a payment with whichever gateway is currently active. */
export async function createPayment(
  supabase: SupabaseClient<Database>,
  input: CreatePaymentInput,
): Promise<PaymentResult & { provider: ProviderId }> {
  const gateway = await getActiveGateway(supabase);
  const payment = await gateway.adapter.createPayment(input, gateway.mode);
  return { ...payment, provider: gateway.provider };
}

/** Look a payment up by its reference, routing to the gateway that owns it. */
export async function getPaymentByReference(id: string): Promise<PaymentResult & { provider: ProviderId }> {
  const owner = (Object.values(GATEWAYS) as GatewayAdapter[]).find((g) => g.ownsReference(id));
  const adapter = owner ?? mollieAdapter;
  const payment = await adapter.getPayment(id);
  return { ...payment, provider: adapter.id };
}
