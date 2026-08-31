import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Shared plumbing for the public /api/v1 layer: API-key auth, scopes,
 * rate limiting, CORS, security headers, audit logging and JSON shapes.
 *
 * Nothing here touches the browser bundle — server-only module.
 */

export const API_VERSION = "v1";

export const API_SCOPES = [
  "READ_TOURS",
  "READ_AVAILABILITY",
  "READ_BUSINESS",
  "CREATE_LEAD",
  "CREATE_BOOKING_REQUEST",
  "READ_CUSTOMERS",
  "WRITE_CUSTOMERS",
  "READ_CONVERSATIONS",
  "WRITE_CONVERSATIONS",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

/** Requests per minute, per API key (or per IP for unauthenticated routes). */
const RATE_LIMIT_PER_MINUTE = Number(process.env["API_RATE_LIMIT_PER_MINUTE"] ?? 120);

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function allowedOrigins(): string[] {
  return (process.env["API_ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(request: Request): Record<string, string> {
  const list = allowedOrigins();
  const origin = request.headers.get("origin");
  const allow = list.length === 0 ? "*" : origin && list.includes(origin) ? origin : list[0]!;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { ...corsHeaders(request), ...SECURITY_HEADERS, ...extra },
  });
}

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "method_not_allowed"
  | "server_error";

export function apiError(
  request: Request,
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
): Response {
  return jsonResponse(request, { success: false, error: { code, message, details } }, status);
}

export function apiOk(request: Request, payload: Record<string, unknown>, status = 200): Response {
  return jsonResponse(request, { success: true, ...payload }, status);
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: { ...corsHeaders(request), ...SECURITY_HEADERS } });
}

/* ------------------------------------------------------------------ keys */

const KEY_NAMESPACE = "tt24";

export function hashApiKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the full one-time token plus the stored prefix/hash pair. */
export function generateApiKey(): { token: string; prefix: string; hash: string } {
  const prefix = `${KEY_NAMESPACE}_${randomBytes(4).toString("hex")}`;
  const token = `${prefix}_${randomBytes(24).toString("hex")}`;
  return { token, prefix, hash: hashApiKey(token) };
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

function extractToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) return header.slice(7).trim() || null;
  return request.headers.get("x-api-key")?.trim() || null;
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export type AuthedKey = { id: string; prefix: string; name: string; scopes: string[] };

/* ------------------------------------------------------- request handling */

type HandlerCtx = {
  request: Request;
  params: Record<string, string>;
  key: AuthedKey | null;
  url: URL;
  /** Parsed + validated JSON body helper. */
  body: <T>(parse: (v: unknown) => T) => Promise<T>;
};

type Options = {
  /** Required scope. `null` = no API key needed (webhooks verify their own secret). */
  scope: ApiScope | null;
  /** Rate limit override (requests per minute). */
  limit?: number;
};

class HttpError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function badRequest(message: string, details?: unknown): never {
  throw new HttpError("validation_error", message, 400, details);
}

export function notFound(message = "Resource not found"): never {
  throw new HttpError("not_found", message, 404);
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function authenticate(request: Request, scope: ApiScope): Promise<AuthedKey> {
  const token = extractToken(request);
  if (!token) throw new HttpError("unauthorized", "Missing API key", 401);

  const prefix = token.split("_").slice(0, 2).join("_");
  const db = await admin();
  const { data } = await db
    .from("api_keys")
    .select("id, name, key_prefix, key_hash, scopes, active, revoked_at, expires_at")
    .eq("key_prefix", prefix)
    .maybeSingle();

  if (!data || !safeEqualHex(hashApiKey(token), data.key_hash)) {
    throw new HttpError("unauthorized", "Invalid API key", 401);
  }
  if (!data.active || data.revoked_at) throw new HttpError("unauthorized", "API key is disabled", 401);
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    throw new HttpError("unauthorized", "API key has expired", 401);
  }
  const scopes = (data.scopes ?? []) as string[];
  if (!scopes.includes(scope)) {
    throw new HttpError("forbidden", `API key is missing the ${scope} scope`, 403);
  }

  return { id: data.id, prefix: data.key_prefix, name: data.name, scopes };
}

async function enforceRateLimit(identifier: string, limit: number) {
  const db = await admin();
  const since = new Date(Date.now() - 60_000).toISOString();
  const query = db
    .from("api_request_logs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  const { count } = identifier.startsWith("ip:")
    ? await query.eq("ip", identifier.slice(3))
    : await query.eq("key_prefix", identifier);

  if ((count ?? 0) >= limit) {
    throw new HttpError("rate_limited", "Too many requests — slow down", 429);
  }
}

async function logRequest(entry: {
  keyId: string | null;
  prefix: string | null;
  request: Request;
  path: string;
  status: number;
  error?: string;
  durationMs: number;
}) {
  try {
    const db = await admin();
    await db.from("api_request_logs").insert({
      api_key_id: entry.keyId,
      key_prefix: entry.prefix,
      method: entry.request.method,
      path: entry.path,
      status: entry.status,
      ip: clientIp(entry.request),
      user_agent: entry.request.headers.get("user-agent")?.slice(0, 300) ?? null,
      error: entry.error?.slice(0, 500) ?? null,
      duration_ms: entry.durationMs,
    });
  } catch (e) {
    console.error("[api] failed to write audit log", e);
  }
}

/**
 * Wraps an endpoint with auth, scopes, rate limiting, validation errors,
 * consistent JSON envelopes, security headers and audit logging.
 */
export function withApi(
  options: Options,
  handler: (ctx: HandlerCtx) => Promise<Response>,
) {
  return async ({ request, params }: { request: Request; params?: Record<string, string> }) => {
    const started = Date.now();
    const url = new URL(request.url);
    let key: AuthedKey | null = null;
    let response: Response;
    let errorText: string | undefined;

    try {
      if (options.scope) key = await authenticate(request, options.scope);
      await enforceRateLimit(
        key ? key.prefix : `ip:${clientIp(request)}`,
        options.limit ?? RATE_LIMIT_PER_MINUTE,
      );

      response = await handler({
        request,
        params: params ?? {},
        key,
        url,
        body: async (parse) => {
          let raw: unknown;
          try {
            raw = await request.json();
          } catch {
            badRequest("Request body must be valid JSON");
          }
          try {
            return parse(raw);
          } catch (e) {
            badRequest("Validation failed", (e as { issues?: unknown }).issues ?? String(e));
          }
        },
      });
    } catch (e) {
      if (e instanceof HttpError) {
        errorText = e.message;
        response = apiError(request, e.code, e.message, e.status, e.details);
      } else {
        errorText = e instanceof Error ? e.message : String(e);
        console.error("[api] unhandled error", e);
        response = apiError(request, "server_error", "Something went wrong", 500);
      }
    }

    void logRequest({
      keyId: key?.id ?? null,
      prefix: key?.prefix ?? null,
      request,
      path: url.pathname + (url.search || ""),
      status: response.status,
      error: errorText,
      durationMs: Date.now() - started,
    });

    return response;
  };
}
