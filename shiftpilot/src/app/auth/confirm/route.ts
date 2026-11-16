import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/portal";

const ALLOWED_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Handles Supabase email links (sign-up confirmation, invitation, password
 * recovery, email change). Recommended template link (see DEPLOYMENT.md):
 *   {{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=<type>
 * The PKCE `code` flow of the default templates is also accepted.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));

  const code = searchParams.get("code");
  if (code) {
    // PKCE flow (default Supabase email templates).
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
