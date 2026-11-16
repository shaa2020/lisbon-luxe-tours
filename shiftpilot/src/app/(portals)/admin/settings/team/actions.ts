"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { invitationEmail, sendEmail } from "@/lib/integrations/email";
import { emailSchema, fieldErrors } from "@/lib/validation/auth";

export interface InviteState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string | undefined>;
  /** Only returned when email delivery is not configured, so the admin can share the link manually. */
  manualLink?: string;
  delivery?: "sent" | "not_configured" | "failed";
}

const inviteSchema = z.object({ email: emailSchema, role_id: z.string().uuid("Choose a role") });

export async function inviteStaffAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await requireStaff("users.manage");
  const parsed = inviteSchema.safeParse({ email: formData.get("email"), role_id: formData.get("role_id") });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const token = randomBytes(32).toString("base64url");
  const supabase = await createClient();
  const { data: role } = await supabase.from("roles").select("name").eq("id", parsed.data.role_id).single();
  const { data: inv, error } = await supabase
    .from("invitations")
    .insert({
      agency_id: ctx.agencyId,
      kind: "staff",
      email: parsed.data.email,
      role_id: parsed.data.role_id,
      token_hash: createHash("sha256").update(token).digest("hex"),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      invited_by: ctx.user.id,
    })
    .select("id")
    .single();
  if (error || !inv) {
    return { message: error?.message.includes("owner") ? "Only an agency owner can invite another owner." : "The invitation could not be created." };
  }

  const link = `${publicEnv().NEXT_PUBLIC_APP_URL}/invite/${token}`;
  const email = invitationEmail({
    agencyName: ctx.agencyName,
    inviterName: ctx.user.fullName ?? ctx.user.email,
    link,
    audience: `agency team (${role?.name ?? "staff"})`,
  });
  const result = await sendEmail({ to: parsed.data.email, ...email, idempotencyKey: `invitation-${inv.id}` });
  revalidatePath("/admin/settings/team");

  if (result.status === "sent") return { ok: true, delivery: "sent", message: `Invitation emailed to ${parsed.data.email}.` };
  return {
    ok: true,
    delivery: result.status,
    manualLink: link,
    message:
      result.status === "not_configured"
        ? "Invitation created. Email delivery is awaiting configuration, so share this one-time link with the invitee yourself."
        : `Invitation created, but the email could not be sent (${result.error}). Share this one-time link with the invitee yourself.`,
  };
}

export async function revokeInvitationAction(formData: FormData) {
  await requireStaff("users.manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", id).is("accepted_at", null);
  revalidatePath("/admin/settings/team");
}

export async function removeRoleAction(formData: FormData): Promise<void> {
  const ctx = await requireStaff("users.manage");
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").delete().eq("id", id).eq("agency_id", ctx.agencyId);
  if (error) throw new Error(error.message.includes("owner") ? error.message : "The role could not be removed.");
  revalidatePath("/admin/settings/team");
}
