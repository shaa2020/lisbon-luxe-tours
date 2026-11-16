import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/portal";
import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  if (await getCurrentUser()) redirect(safeNextPath(next));
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Agency staff, clients and workers sign in here.</p>
      </div>
      {error === "link" && <Alert tone="warning">That link is invalid or has expired. Please request a new one.</Alert>}
      <LoginForm next={next} />
      <p className="text-xs text-muted-foreground">
        Accounts are created by invitation. If you were invited, use the link in your invitation email.
      </p>
    </div>
  );
}
