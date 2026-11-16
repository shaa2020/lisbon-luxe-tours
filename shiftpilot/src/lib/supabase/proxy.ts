import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security/csp";

const PROTECTED_PREFIXES = ["/admin", "/client", "/worker", "/portal", "/account"];

/**
 * Runs before every page request:
 *  1. issues a per-request CSP nonce;
 *  2. refreshes the Supabase session cookie;
 *  3. redirects signed-out visitors away from portal routes.
 * This is a convenience layer only — pages and server actions re-check
 * authorisation, and PostgreSQL RLS is the final authority.
 */
export async function updateSession(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const csp = buildCsp(nonce, { supabaseUrl, isDev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(p + "/"));

  let userId: string | null = null;
  if (supabaseUrl && anonKey) {
    const supabase = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    // Validates the JWT with Supabase Auth and refreshes it when needed.
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  if (isProtected && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    const redirect = NextResponse.redirect(url);
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }

  response.headers.set("Content-Security-Policy", csp);
  if (isProtected) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
