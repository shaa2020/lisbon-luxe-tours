import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We will email you a secure link to choose a new password.</p>
      </div>
      <ForgotPasswordForm />
      <Link href="/login" className="block text-center text-sm text-primary hover:underline">
        Back to sign in
      </Link>
    </div>
  );
}
