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

/**
 * Optional itemised breakdown. Gateways that support a catalog (Stripe) use it
 * so each tour / add-on shows up as its own product in reporting; gateways that
 * only take a single amount ignore it. The sum of the items must equal
 * `amountCents`, otherwise the flat amount is used.
 */
export type PaymentLineItem = {
  /** Human-readable price id created in the payment provider, if any. */
  priceId?: string;
  name: string;
  unitAmountCents: number;
  quantity: number;
};

export type CreatePaymentInput = {
  amountCents: number;
  description: string;
  origin: string;
  metadata: Record<string, string>;
  redirectPath?: string;
  lineItems?: PaymentLineItem[];
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

/**
 * Keys entered by the admin (encrypted in the database) take priority over
 * environment secrets. Refreshed before any gateway operation.
 */
let SECRET_CACHE: Record<string, Record<string, string>> = {};

export async function refreshGatewaySecretCache() {
  const { loadAllGatewaySecrets } = await import("./gateway-secrets.server");
  SECRET_CACHE = await loadAllGatewaySecrets();
  return SECRET_CACHE;
}

function secret(provider: ProviderId, mode: GatewayMode, key: string): string {
  return (SECRET_CACHE[`${provider}:${mode}`]?.[key] || "").trim() || env(key);
}

/** Which keys each gateway asks the admin for, per mode. */
export const GATEWAY_FIELDS: Record<ProviderId, { key: string; label: string; help: string }[]> = {
  stripe: [],
  mollie: [
    {
      key: "MOLLIE_API_KEY",
      label: "Mollie API key",
      help: "Mollie dashboard → Developers → API keys. Use the live key (live_…) in Live mode and the test key (test_…) in Test mode.",
    },
  ],
  paypal: [
    { key: "PAYPAL_CLIENT_ID", label: "Client ID", help: "PayPal Developer dashboard → Apps & Credentials." },
    { key: "PAYPAL_CLIENT_SECRET", label: "Secret", help: "Shown next to the client ID in the same app." },
  ],
  manual: [],
};

/* ------------------------------------------------------------------ Mollie */

const MOLLIE_API = "https://api.mollie.com/v2";

function mollieKey(mode: GatewayMode): string {
  return (
    secret("mollie", mode, "MOLLIE_API_KEY") ||
    (mode === "live" ? env("MOLLIE_LIVE_API_KEY") : env("MOLLIE_TEST_API_KEY"))
  );
}


async function mollieFetch(
  path: string,
  mode: GatewayMode,
  init?: { method?: string; body?: Record<string, unknown> },
) {
  const key = mollieKey(mode);
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
  hasCredentials: (mode) => !!mollieKey(mode),
  ownsReference: (id) => id.startsWith("tr_"),
  async createPayment(input, mode) {
    const isLocal = input.origin.includes("localhost") || input.origin.includes("127.0.0.1");
    const redirectPath = input.redirectPath || "/booking/success";
    const body: Record<string, unknown> = {
      amount: { currency: "EUR", value: (input.amountCents / 100).toFixed(2) },
      description: input.description.slice(0, 255),
      redirectUrl: `${input.origin}${redirectPath}?session_id=`,
      metadata: input.metadata,
    };
    if (!isLocal) body["webhookUrl"] = `${input.origin}/api/public/payments/mollie`;

    const created = normalizeMollie(await mollieFetch("/payments", mode, { method: "POST", body }));
    const updated = normalizeMollie(
      await mollieFetch(`/payments/${created.id}`, mode, {
        method: "PATCH",
        body: { redirectUrl: `${input.origin}${redirectPath}?session_id=${created.id}` },
      }),
    );
    return { ...updated, checkoutUrl: updated.checkoutUrl || created.checkoutUrl };
  },
  async getPayment(id) {
    const mode: GatewayMode = mollieKey("live") ? "live" : "test";
    return normalizeMollie(await mollieFetch(`/payments/${encodeURIComponent(id)}`, mode));
  },
  async testConnection(mode) {
    if (!mollieKey(mode)) return { ok: false, message: `No Mollie ${mode} API key saved yet.` };
    try {
      const me = await mollieFetch("/methods?limit=5", mode);
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
  return mode === "live"
    ? secret("stripe", "live", "STRIPE_LIVE_API_KEY")
    : secret("stripe", "test", "STRIPE_SANDBOX_API_KEY");
}


async function stripeFetch(
  path: string,
  mode: GatewayMode,
  init?: { method?: string; form?: Record<string, string> },
) {
  const key = stripeKey(mode);
  const lovableKey = env("LOVABLE_API_KEY");
  if (!key) throw new Error(`Stripe ${mode} key not configured`);

  const method = init?.method || "GET";
  const body = init?.form ? new URLSearchParams(init.form).toString() : undefined;
  // Stable per-call key so a retried POST can never create a duplicate object.
  const idempotencyKey = method === "POST" ? crypto.randomUUID() : undefined;

  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    try {
      const res = await fetch(`${STRIPE_GATEWAY}${path}`, {
        method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Connection-Api-Key": key,
          "Lovable-API-Key": lovableKey,
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body,
      });
      const text = await res.text();
      if (res.ok) return text ? JSON.parse(text) : {};
      lastError = `Stripe ${path} ${res.status}: ${text.slice(0, 300)}`;
      // 4xx are real errors — surface immediately. 5xx are gateway blips: retry.
      if (res.status < 500) throw new Error(lastError);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === lastError && !lastError.includes(" 5")) throw err;
      lastError = message;
    }
  }
  throw new Error(lastError || `Stripe ${path} failed`);
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
      "payment_intent_data[description]": input.description.slice(0, 250),
    };

    const items = (input.lineItems ?? []).filter((i) => i.unitAmountCents > 0 && i.quantity > 0);
    const itemsTotal = items.reduce((sum, i) => sum + i.unitAmountCents * i.quantity, 0);
    const useItems = items.length > 0 && itemsTotal === input.amountCents;

    if (useItems) {
      // Match each item to its catalog price when the amount still lines up, so
      // reporting groups by tour; otherwise fall back to an inline price.
      const lookupKeys = items.map((i) => i.priceId).filter(Boolean) as string[];
      const catalog: Record<string, { id: string; unit_amount: number }> = {};
      if (lookupKeys.length) {
        try {
          const qs = lookupKeys.map((k) => `lookup_keys[]=${encodeURIComponent(k)}`).join("&");
          const res = await stripeFetch(`/v1/prices?limit=100&${qs}`, mode);
          for (const p of res?.data ?? []) {
            if (p?.lookup_key) catalog[p.lookup_key] = { id: p.id, unit_amount: Number(p.unit_amount || 0) };
          }
        } catch {
          /* catalog lookup is best-effort — inline pricing still works */
        }
      }

      items.forEach((item, index) => {
        const match = item.priceId ? catalog[item.priceId] : undefined;
        form[`line_items[${index}][quantity]`] = String(item.quantity);
        if (match && match.unit_amount === item.unitAmountCents) {
          form[`line_items[${index}][price]`] = match.id;
        } else {
          form[`line_items[${index}][price_data][currency]`] = "eur";
          form[`line_items[${index}][price_data][unit_amount]`] = String(item.unitAmountCents);
          form[`line_items[${index}][price_data][product_data][name]`] = item.name.slice(0, 250);
        }
      });
    } else {
      form["line_items[0][quantity]"] = "1";
      form["line_items[0][price_data][currency]"] = "eur";
      form["line_items[0][price_data][unit_amount]"] = String(input.amountCents);
      form["line_items[0][price_data][product_data][name]"] = input.description.slice(0, 250);
    }

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
  const id = secret("paypal", mode, "PAYPAL_CLIENT_ID") || env("PAYPAL_SANDBOX_CLIENT_ID");
  const clientSecret =
    secret("paypal", mode, "PAYPAL_CLIENT_SECRET") || env("PAYPAL_SECRET") || env("PAYPAL_SANDBOX_SECRET");
  return { id, secret: clientSecret };
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
  await refreshGatewaySecretCache();
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
  await refreshGatewaySecretCache();
  const owner = (Object.values(GATEWAYS) as GatewayAdapter[]).find((g) => g.ownsReference(id));
  const adapter = owner ?? mollieAdapter;

  const payment = await adapter.getPayment(id);
  return { ...payment, provider: adapter.id };
}
