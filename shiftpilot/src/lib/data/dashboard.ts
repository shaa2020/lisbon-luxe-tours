import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayRange, monthRange, addDays, localDate, zonedMidnight } from "@/lib/time";
import type { StaffContext } from "@/lib/auth/session";

/**
 * Admin dashboard metrics. Every number is a live query executed as the
 * signed-in user under RLS. Metrics the user is not permitted to see are
 * returned as `null` (hidden in the UI), never as a misleading zero.
 */
export interface DashboardMetrics {
  activeClients: number | null;
  workers: { total: number; employees: number; freelancers: number } | null;
  shiftsToday: number | null;
  shiftsNext7Days: number | null;
  unfilledShifts: number | null;
  workersOnDuty: number | null;
  pendingTimesheets: number | null;
  pendingRequests: number | null;
  billedThisMonth: number | null;
  outstanding: { amount: number; count: number; overdue: number } | null;
}

type CountResult = PromiseLike<{ count: number | null; error: unknown }>;

async function count(q: CountResult): Promise<number> {
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
}

export async function getDashboardMetrics(ctx: StaffContext, now = new Date()): Promise<DashboardMetrics> {
  const supabase = await createClient();
  const a = ctx.agencyId;
  const today = dayRange(now);
  const weekEnd = zonedMidnight(addDays(localDate(now), 8));
  const month = monthRange(now);
  const shifts = () => supabase.from("shifts").select("id", { count: "exact", head: true }).eq("agency_id", a);

  const [activeClients, workers, shiftsToday, shiftsNext7Days, unfilledShifts, workersOnDuty, pendingTimesheets, pendingRequests, billedThisMonth, outstanding] =
    await Promise.all([
      ctx.can("clients.read")
        ? count(supabase.from("clients").select("id", { count: "exact", head: true }).eq("agency_id", a).eq("status", "active"))
        : null,
      ctx.can("workers.read")
        ? (async () => {
            const { data, error } = await supabase.from("workers").select("engagement_type").eq("agency_id", a).eq("status", "active");
            if (error) throw error;
            const rows = data ?? [];
            return {
              total: rows.length,
              employees: rows.filter((r) => r.engagement_type === "employee").length,
              freelancers: rows.filter((r) => r.engagement_type === "freelancer").length,
            };
          })()
        : null,
      ctx.can("shifts.read")
        ? count(shifts().neq("status", "cancelled").gte("starts_at", today.start.toISOString()).lt("starts_at", today.end.toISOString()))
        : null,
      ctx.can("shifts.read")
        ? count(shifts().neq("status", "cancelled").gte("starts_at", now.toISOString()).lt("starts_at", weekEnd.toISOString()))
        : null,
      ctx.can("shifts.read")
        ? count(shifts().in("status", ["open", "offered", "partially_filled"]).gte("starts_at", now.toISOString()))
        : null,
      ctx.can("shifts.read")
        ? count(supabase.from("shift_assignments").select("id", { count: "exact", head: true }).eq("agency_id", a).eq("status", "checked_in"))
        : null,
      ctx.can("timesheets.read")
        ? count(supabase.from("timesheets").select("id", { count: "exact", head: true }).eq("agency_id", a).in("status", ["submitted", "client_approved"]))
        : null,
      ctx.can("requests.read")
        ? count(supabase.from("shift_requests").select("id", { count: "exact", head: true }).eq("agency_id", a).in("status", ["submitted", "under_review"]))
        : null,
      ctx.can("finance.read")
        ? (async () => {
            const { data, error } = await supabase
              .from("invoices")
              .select("total")
              .eq("agency_id", a)
              .eq("kind", "invoice")
              .not("status", "in", "(draft,review,cancelled)")
              .gte("issue_date", localDate(month.start))
              .lt("issue_date", localDate(month.end));
            if (error) throw error;
            return (data ?? []).reduce((s, r) => s + Number(r.total), 0);
          })()
        : null,
      ctx.can("finance.read")
        ? (async () => {
            const { data, error } = await supabase
              .from("invoices")
              .select("total, amount_paid, due_date")
              .eq("agency_id", a)
              .in("status", ["issued", "partially_paid"]);
            if (error) throw error;
            const rows = data ?? [];
            const todayStr = localDate(now);
            return {
              amount: rows.reduce((s, r) => s + Number(r.total) - Number(r.amount_paid), 0),
              count: rows.length,
              overdue: rows.filter((r) => r.due_date !== null && r.due_date < todayStr).length,
            };
          })()
        : null,
    ]);

  return {
    activeClients, workers, shiftsToday, shiftsNext7Days, unfilledShifts, workersOnDuty, pendingTimesheets, pendingRequests,
    billedThisMonth, outstanding,
  };
}

export async function getRecentActivity(ctx: StaffContext, limit = 8) {
  if (!ctx.can("audit.read")) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, changed_fields, created_at, actor_user_id")
    .eq("agency_id", ctx.agencyId)
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
