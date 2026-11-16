import type { Metadata } from "next";
import { CalendarDays, Inbox, MapPin } from "lucide-react";
import { requireWorker } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { EmptyState, PageHeader } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Home" };

export default async function WorkerHome() {
  const ctx = await requireWorker();
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [next, invitations, tasks] = await Promise.all([
    supabase
      .from("shift_assignments")
      .select("id, status, starts_at, ends_at, shifts(title, client_locations(name, address_line1, city))")
      .eq("worker_id", ctx.workerId)
      .in("status", ["accepted", "confirmed", "checked_in"])
      .gte("ends_at", now)
      .order("starts_at")
      .limit(5),
    supabase.from("shift_invitations").select("id", { count: "exact", head: true }).eq("worker_id", ctx.workerId).eq("status", "pending"),
    supabase.from("onboarding_tasks").select("id, title, status, is_required").eq("worker_id", ctx.workerId).in("status", ["pending", "blocked"]).order("sort_order"),
  ]);
  const nextShift = next.data?.[0];

  return (
    <>
      <PageHeader title={`Hi ${ctx.user.fullName?.split(" ")[0] ?? "there"}`} />
      {ctx.status !== "active" && (
        <Alert tone="info" title="Your onboarding is in progress" className="mb-4">
          You can receive shift offers once the agency has completed your onboarding checks.
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Next shift</CardTitle></CardHeader>
          <CardContent>
            {nextShift ? (
              <div className="space-y-1 text-sm">
                <p className="text-base font-semibold">{nextShift.shifts?.title}</p>
                <p className="text-muted-foreground">{formatDateTime(nextShift.starts_at)}</p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden />
                  {nextShift.shifts?.client_locations?.name}, {nextShift.shifts?.client_locations?.city}
                </p>
                <Badge tone={nextShift.status === "confirmed" ? "success" : "info"}>{nextShift.status}</Badge>
              </div>
            ) : (
              <EmptyState icon={CalendarDays} title="No upcoming shifts" description="Accepted shifts appear here." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Shift offers</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-primary-soft p-2 text-primary-soft-foreground"><Inbox className="size-5" aria-hidden /></span>
              <p className="text-sm"><span className="text-2xl font-semibold tabular-nums">{invitations.count ?? 0}</span> open offer{invitations.count === 1 ? "" : "s"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {tasks.data && tasks.data.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle>To do</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border text-sm">
              {tasks.data.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-2">
                  <span>{t.title}</span>
                  {t.is_required && <Badge tone="warning">Required</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}
