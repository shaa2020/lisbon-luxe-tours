import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";

/** Client IP as reported by the hosting proxy (best effort). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** One-way hash so raw IPs/emails are never stored in rate-limit or log tables. */
export function hashIdentifier(value: string): string {
  const salt = process.env.IDENTIFIER_HASH_SALT ?? "shiftpilot";
  return createHash("sha256").update(`${salt}:${value.toLowerCase()}`).digest("hex").slice(0, 40);
}

/**
 * Shared fixed-window rate limit backed by PostgreSQL (works across serverless
 * instances). Returns true when the action is allowed. If the service role is
 * not configured, it fails open and relies on Supabase Auth's own limits;
 * this is reported as a deployment warning in DEVELOPMENT_STATUS.md.
 */
export async function rateLimit(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (!isAdminClientConfigured()) return true;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: `${scope}:${hashIdentifier(identifier)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}

/** Same-origin check for non-Server-Action POST handlers (CSRF defence). */
export async function isSameOrigin(): Promise<boolean> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
