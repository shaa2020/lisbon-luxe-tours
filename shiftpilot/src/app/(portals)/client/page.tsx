import type { Metadata } from "next";
import { CalendarDays, ClipboardCheck, Inbox, Receipt } from "lucide-react";
import { requireClient } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatMoney } from "@/lib/time";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Overview" };

export default async function ClientOverview() {
  const ctx = await requireClient();
  const supabase = await createClient();
  const now = new Date().toISOString();
  // All queries run under RLS: only this client's data at permitted locations is visible.
  const [upcoming, openRequests, pendingTimesheets, invoices] = await Promise.all([
    supabase
      .from("shifts")
      .select("id, title, starts_at, ends_at, status, client_locations(name)")
      .eq("client_id", ctx.clientId)
      .gte("ends_at", now)
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(8),
    supabase.from("shift_requests").select("id", { count: "exact", head: true }).eq("client_id", ctx.clientId).in("status", ["submitted", "under_review"]),
    supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("client_id", ctx.clientId).eq("status", "submitted"),
    ctx.capabilities.finance
      ? supabase.from("invoices").select("id, invoice_number, total, amount_paid, due_date, status").eq("client_id", ctx.clientId).order("issue_date", { ascending: false }).limit(5)
      : Promise.resolve({ data: null }),
  ]);

  return (
    <>
      <PageHeader title={`Welcome, ${ctx.user.fullName?.split(" ")[0] ?? ""}`.trim()} description={`Staffing overview for ${ctx.clientName}.`} />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Upcoming shifts" value={upcoming.data?.length ?? 0} icon={CalendarDays} tone="info" />
        <StatCard label="Open staffing requests" value={openRequests.count ?? 0} icon={Inbox} />
        <StatCard label="Timesheets to approve" value={pendingTimesheets.count ?? 0} icon={ClipboardCheck} tone={(pendingTimesheets.count ?? 0) > 0 && ctx.capabilities.approve ? "warning" : "neutral"} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Upcoming shifts</CardTitle></CardHeader>
          <CardContent>
            {!upcoming.data || upcoming.data.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming shifts" description="Shifts scheduled by the agency for your locations appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.data.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>
                      <span className="block font-medium">{s.title}</span>
                      <span className="text-muted-foreground">{s.client_locations?.name} · {formatDateTime(s.starts_at)}</span>
                    </span>
                    <Badge tone={s.status === "filled" ? "success" : "warning"}>{s.status.replace("_", " ")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {invoices.data && (
          <Card>
            <CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader>
            <CardContent>
              {invoices.data.length === 0 ? (
                <EmptyState icon={Receipt} title="No invoices yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {invoices.data.map((i) => (
                    <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium">{i.invoice_number}</span>
                      <span className="tabular-nums">{formatMoney(Number(i.total))}</span>
                      <Badge tone={i.status === "paid" ? "success" : "neutral"}>{i.status.replace("_", " ")}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
