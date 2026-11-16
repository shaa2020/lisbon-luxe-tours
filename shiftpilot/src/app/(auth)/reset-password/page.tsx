import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { NewPasswordForm } from "./form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // A valid recovery link creates a short-lived session via /auth/confirm.
  if (!(await getCurrentUser())) redirect("/login?error=link");
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Use at least 12 characters. A short sentence works well.</p>
      </div>
      <NewPasswordForm />
    </div>
  );
}
