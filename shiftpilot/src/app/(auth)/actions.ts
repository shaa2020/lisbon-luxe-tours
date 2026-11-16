"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/portal";
import { clientIp, rateLimit } from "@/lib/security/request";
import {
  fieldErrors, newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema, type FieldErrors,
} from "@/lib/validation/auth";

export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: FieldErrors;
}

const GENERIC_SIGNIN_ERROR = "The email or password is incorrect, or the account is not yet confirmed.";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ip = await clientIp();
  if (!(await rateLimit("signin", `${ip}|${parsed.data.email}`, 10, 15 * 60))) {
    return { message: "Too many sign-in attempts. Please wait 15 minutes and try again." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error || !data.user) return { message: GENERIC_SIGNIN_ERROR };

  await supabase.from("user_sessions").insert({ user_id: data.user.id, event: "sign_in" });
  redirect(safeNextPath(parsed.data.next));
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const ip = await clientIp();
  const allowed = await rateLimit("pwreset", `${ip}|${parsed.data.email}`, 5, 60 * 60);
  if (allowed) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
    });
  }
  // Identical response whether or not the account exists (no user enumeration).
  return { ok: true, message: "If an account exists for that address, we have sent a link to reset the password." };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { message: "Your reset link has expired. Request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: error.message };
  await supabase.from("user_sessions").insert({ user_id: userData.user.id, event: "password_changed" });
  redirect("/portal");
}

/** Account creation is only offered from a valid invitation link. */
export async function signUpFromInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return { message: "This invitation link is not valid." };

  const ip = await clientIp();
  if (!(await rateLimit("signup", ip, 10, 60 * 60))) return { message: "Too many attempts. Please try again later." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv().NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent(`/invite/${token}`)}`,
    },
  });
  if (error) return { message: error.message };
  if (data.session) redirect(`/invite/${token}`);
  return { ok: true, message: "Check your inbox to confirm your email address. The confirmation link brings you back here to finish." };
}
