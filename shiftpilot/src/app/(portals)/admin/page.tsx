import type { Metadata } from "next";
import { Building2, CalendarClock, CalendarDays, ClipboardCheck, Euro, Inbox, Receipt, UserCheck, Users } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { getDashboardMetrics, getRecentActivity } from "@/lib/data/dashboard";
import { formatDateTime, formatMoney } from "@/lib/time";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/feedback";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Dashboard" };

const TABLE_LABELS: Record<string, string> = {
  agencies: "Agency", agency_settings: "Agency settings", user_roles: "Role assignment", clients: "Client", client_memberships: "Client user",
  workers: "Worker", shifts: "Shift", shift_assignments: "Assignment", invoices: "Invoice", timesheets: "Timesheet", documents: "Document",
  leads: "Lead", shift_requests: "Staffing request", invitations: "Invitation",
};

export default async function AdminDashboard() {
  const ctx = await requireStaff("dashboard.view");
  const [m, activity] = await Promise.all([getDashboardMetrics(ctx), getRecentActivity(ctx)]);
  const nothingYet = (m.activeClients ?? 0) === 0 && (m.workers?.total ?? 0) === 0;

  return (
    <>
      <PageHeader title="Dashboard" description={`Live operational overview for ${ctx.agencyName}.`} />

      {nothingYet && (
        <Alert tone="info" title="Your agency workspace is ready" className="mb-6">
          Start by completing your agency settings and inviting your team. Client, worker and shift modules become available as they
          are released — see the roadmap in the project documentation.
        </Alert>
      )}

      <section aria-label="Operations" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {m.shiftsToday !== null && <StatCard label="Shifts today" value={m.shiftsToday} icon={CalendarDays} tone="info" />}
        {m.unfilledShifts !== null && (
          <StatCard label="Unfilled upcoming shifts" value={m.unfilledShifts} icon={CalendarClock} tone={m.unfilledShifts > 0 ? "warning" : "success"} />
        )}
        {m.workersOnDuty !== null && <StatCard label="Workers on duty" value={m.workersOnDuty} icon={UserCheck} tone="success" />}
        {m.shiftsNext7Days !== null && <StatCard label="Shifts next 7 days" value={m.shiftsNext7Days} icon={CalendarDays} />}
        {m.pendingRequests !== null && <StatCard label="Staffing requests to review" value={m.pendingRequests} icon={Inbox} tone={m.pendingRequests > 0 ? "warning" : "neutral"} />}
        {m.pendingTimesheets !== null && <StatCard label="Timesheets awaiting approval" value={m.pendingTimesheets} icon={ClipboardCheck} />}
        {m.activeClients !== null && <StatCard label="Active clients" value={m.activeClients} icon={Building2} />}
        {m.workers !== null && (
          <StatCard
            label="Active workers"
            value={m.workers.total}
            hint={`${m.workers.employees} employees · ${m.workers.freelancers} freelancers`}
            icon={Users}
          />
        )}
      </section>

      {(m.billedThisMonth !== null || m.outstanding !== null) && (
        <section aria-label="Finance" className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {m.billedThisMonth !== null && <StatCard label="Invoiced this month" value={formatMoney(m.billedThisMonth)} icon={Euro} />}
          {m.outstanding !== null && (
            <StatCard
              label="Outstanding receivables"
              value={formatMoney(m.outstanding.amount)}
              hint={`${m.outstanding.count} open · ${m.outstanding.overdue} overdue`}
              icon={Receipt}
              tone={m.outstanding.overdue > 0 ? "danger" : "neutral"}
            />
          )}
        </section>
      )}

      {activity && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest changes recorded in the audit log.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="divide-y divide-border">
                {activity.map((a) => (
                  <li key={a.id} className="flex flex-col gap-0.5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="font-medium capitalize">{a.action}</span>{" "}
                      <span className="text-muted-foreground">{TABLE_LABELS[a.table_name ?? ""] ?? a.table_name}</span>
                      {a.changed_fields && a.changed_fields.length > 0 && (
                        <span className="text-muted-foreground"> · {a.changed_fields.slice(0, 3).join(", ")}</span>
                      )}
                    </span>
                    <time className="text-xs text-muted-foreground" dateTime={a.created_at}>
                      {formatDateTime(a.created_at)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
