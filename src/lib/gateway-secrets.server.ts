import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Payment gateway API keys entered from the admin panel.
 * Stored AES-256-GCM encrypted in a server-only table; never sent to the browser.
 */

export type SecretBag = Record<string, string>;

function key(): Buffer {
  const raw = process.env["GATEWAY_SECRET_ENC_KEY"];
  if (!raw) throw new Error("GATEWAY_SECRET_ENC_KEY is not configured");
  return createHash("sha256").update(raw).digest();
}

function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

function decrypt(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** All saved gateway secrets, keyed as `provider:mode`. */
export async function loadAllGatewaySecrets(): Promise<Record<string, SecretBag>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("payment_gateway_secrets")
    .select("provider, mode, secrets_ciphertext");
  if (error || !data) return {};

  const out: Record<string, SecretBag> = {};
  for (const row of data as { provider: string; mode: string; secrets_ciphertext: string }[]) {
    try {
      out[`${row.provider}:${row.mode}`] = JSON.parse(decrypt(row.secrets_ciphertext)) as SecretBag;
    } catch {
      /* unreadable value — treat as missing */
    }
  }
  return out;
}

export async function saveGatewaySecrets(provider: string, mode: string, values: SecretBag) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const existing = (await loadAllGatewaySecrets())[`${provider}:${mode}`] ?? {};
  const merged: SecretBag = { ...existing };
  for (const [k, v] of Object.entries(values)) {
    const trimmed = v.trim();
    if (trimmed) merged[k] = trimmed;
    else delete merged[k];
  }

  const { error } = await supabaseAdmin.from("payment_gateway_secrets").upsert(
    {
      provider,
      mode,
      secrets_ciphertext: encrypt(JSON.stringify(merged)),
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "provider,mode" },
  );
  if (error) throw new Error(error.message);
  return Object.keys(merged);
}

export async function clearGatewaySecrets(provider: string, mode: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("payment_gateway_secrets").delete().eq("provider", provider).eq("mode", mode);
}
