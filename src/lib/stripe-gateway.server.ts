const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

export function getStripeKey(): string {
  const key =
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_LIVE_API_KEY ||
    process.env.STRIPE_SANDBOX_API_KEY ||
    "";
  if (!key) throw new Error("Stripe key not configured");
  return key;
}

export function getLovableKey(): string {
  const key = process.env.LOVABLE_API_KEY || "";
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return key;
}

export async function stripeFetch(
  path: string,
  init?: { method?: string; form?: Record<string, string> },
) {
  const headers: Record<string, string> = {
    "Lovable-API-Key": getLovableKey(),
    "X-Connection-Api-Key": getStripeKey(),
  };
  let body: BodyInit | undefined;
  if (init?.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init?.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Stripe ${path} ${res.status}: ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : {};
}
