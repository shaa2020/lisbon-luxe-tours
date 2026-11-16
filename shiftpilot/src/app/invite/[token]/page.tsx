import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { BrandMark } from "@/components/layout/brand";
import { Alert } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/auth/session";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { AcceptInvitationForm, InvitationSignUpForm } from "./forms";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

const KIND_LABEL = { staff: "agency team", client: "client portal", worker: "worker portal" } as const;

async function lookupInvitation(token: string) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token) || !isAdminClientConfigured()) return null;
  // Service role is required because the invitee has no account yet. Only the
  // holder of the secret token can trigger this lookup.
  const admin = createAdminClient();
  const { data } = await admin
    .from("invitations")
    .select("email, kind, expires_at, accepted_at, revoked_at, agencies(name)")
    .eq("token_hash", createHash("sha256").update(token).digest("hex"))
    .maybeSingle();
  return data;
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([lookupInvitation(token), getCurrentUser()]);
  const invalid = !invitation || invitation.revoked_at || invitation.accepted_at || new Date(invitation.expires_at) < new Date();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <BrandMark className="size-8" />
        <span className="text-lg font-semibold">ShiftPilot</span>
      </div>
      <div className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm">
        {invalid ? (
          <>
            <h1 className="text-lg font-semibold">Invitation unavailable</h1>
            <Alert tone="warning">
              This invitation is invalid, expired, revoked or has already been used. Ask the sender for a new invitation.
            </Alert>
            <Link href="/login" className="block text-center text-sm text-primary hover:underline">Go to sign in</Link>
          </>
        ) : (
          <>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold">You are invited</h1>
              <p className="text-sm text-muted-foreground">
                {invitation.agencies?.name ?? "An agency"} invited <strong className="text-foreground">{invitation.email}</strong> to
                the {KIND_LABEL[invitation.kind as keyof typeof KIND_LABEL]}.
              </p>
            </div>
            {user ? (
              user.email.toLowerCase() === invitation.email.toLowerCase() ? (
                <AcceptInvitationForm token={token} />
              ) : (
                <Alert tone="warning" title="Signed in with a different account">
                  You are signed in as {user.email}. Sign out and sign in as {invitation.email} to accept.
                </Alert>
              )
            ) : (
              <>
                <InvitationSignUpForm token={token} email={invitation.email} />
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
