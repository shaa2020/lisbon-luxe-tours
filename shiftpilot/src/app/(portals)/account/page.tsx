import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { PageHeader } from "@/components/ui/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Account & security" };

const EVENT_LABEL: Record<string, string> = {
  sign_in: "Signed in", sign_out: "Signed out", password_changed: "Password changed",
  password_reset_requested: "Password reset requested", sign_in_failed: "Failed sign-in",
};

export default async function AccountPage() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const [{ data: profile }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, locale, email").eq("id", user.id).single(),
    supabase.from("user_sessions").select("id, event, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <PageHeader title="Account & security" actions={<ThemeToggle />} />
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>{profile && <ProfileForm profile={profile} />}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Password</CardTitle><CardDescription>At least 12 characters.</CardDescription></CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Recent security activity</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id} className="flex justify-between py-2">
                  <span>{EVENT_LABEL[e.event] ?? e.event}</span>
                  <span className="text-muted-foreground">{formatDateTime(e.created_at)}</span>
                </li>
              ))}
              {(!events || events.length === 0) && <li className="py-2 text-muted-foreground">No activity recorded yet.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
