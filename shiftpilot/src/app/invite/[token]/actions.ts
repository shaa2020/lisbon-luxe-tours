"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/app/(auth)/actions";

export async function acceptInvitationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  // accept_invitation() validates the token hash, expiry, email match and
  // single use inside one transaction.
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { message: error.message };
  const kind = (data as { kind?: string } | null)?.kind;
  redirect(kind === "staff" ? "/admin" : kind === "client" ? "/client" : "/worker");
}
