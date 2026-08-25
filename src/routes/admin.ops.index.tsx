import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import {
  opsAllPaymentsQuery,
  opsBookingsQuery,
  opsRequestsQuery,
  opsVehiclesQuery,
} from "@/lib/ops/queries";
import { money, statusTone, todayISO } from "@/lib/ops/types";
import { syncWebsiteBookings } from "@/lib/ops-sync.functions";
import { RefreshCw, Plus } from "lucide-react";

export const Route = createFileRoute("/admin/ops/")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const sync = useServerFn(syncWebsiteBookings);
  const [syncing, setSyncing] = useState(false);
  const { data: jobs = [] } = useQuery(opsBookingsQuery);
  const { data: payments = [] } = useQuery(opsAllPaymentsQuery);
  const { data: vehicles = [] } = useQuery(opsVehiclesQuery);
  const { data: requests = [] } = useQuery(opsRequestsQuery);

  const today = todayISO();
  const todays = jobs.filter((j) => j.tour_date === today);
  const upcoming = jobs
    .filter((j) => j.tour_date > today && j.status !== "Cancelled")
    .sort((a, b) => a.tour_date.localeCompare(b.tour_date))
    .slice(0, 6);
  const unassigned = jobs.filter(
    (j) => j.tour_date >= today && j.status !== "Cancelled" && (!j.driver_id || !j.vehicle_id),
  );
  const openRequests = requests.filter((r) => r.status === "Open");
  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(
    0,
    jobs.filter((j) => j.status !== "Cancelled").reduce((s, j) => s + Number(j.total), 0) -
      collected,
  );

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await sync({ data: {} });
      toast.success(
        res.imported > 0 ? `Imported ${res.imported} website booking(s)` : "Already up to date",
      );
      qc.invalidateQueries({ queryKey: ["ops"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminShell>
      <OpsPage
        title="Dispatch"
        description="Live overview of today's operation."
        actions={
          <div className="flex gap-2">
            <button
              onClick={runSync}
              disabled={syncing}
              className="rounded-md border border-border px-3 py-2.5 text-sm inline-flex items-center gap-1.5 hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Import website
              bookings
            </button>
            <Link
              to="/admin/ops/jobs/$id"
              params={{ id: "new" }}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> New job
            </Link>
          </div>
        }
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Stat label="Jobs today" value={String(todays.length)} />
          <Stat label="Needs dispatch" value={String(unassigned.length)} />
          <Stat label="Open requests" value={String(openRequests.length)} />
          <Stat label="Outstanding" value={money(outstanding)} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Panel
            title="Today"
            empty="No jobs today."
            link={{ to: "/admin/ops/today", label: "Day sheet" }}
          >
            {todays
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((j) => (
                <JobRow key={j.id} id={j.id} time={j.start_time.slice(0, 5)} title={j.tour_name}
                  sub={`${j.ops_customers?.name ?? "No customer"} · ${j.driver?.name ?? "No driver"}`}
                  status={j.status} />
              ))}
          </Panel>

          <Panel
            title="Needs a driver or vehicle"
            empty="Everything is dispatched."
            link={{ to: "/admin/ops/jobs", label: "All jobs" }}
          >
            {unassigned.slice(0, 8).map((j) => (
              <JobRow key={j.id} id={j.id} time={j.tour_date.slice(5)} title={j.tour_name}
                sub={`${j.driver?.name ? "Driver ok" : "No driver"} · ${j.ops_vehicles?.name ? "Vehicle ok" : "No vehicle"}`}
                status={j.status} />
            ))}
          </Panel>

          <Panel title="Upcoming" empty="Nothing scheduled yet.">
            {upcoming.map((j) => (
              <JobRow key={j.id} id={j.id} time={j.tour_date.slice(5)} title={j.tour_name}
                sub={`${j.start_time.slice(0, 5)} · ${j.guests} guests`} status={j.status} />
            ))}
          </Panel>

          <Panel title="Fleet" empty="No vehicles yet.">
            {vehicles.map((v) => (
              <div key={v.id} className="flex items-center justify-between py-2 text-sm">
                <span>{v.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[v.status] ?? "bg-muted"}`}
                >
                  {v.status}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </OpsPage>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-2xl mt-1">{value}</p>
    </div>
  );
}

function Panel({
  title,
  empty,
  link,
  children,
}: {
  title: string;
  empty: string;
  link?: { to: "/admin/ops/today" | "/admin/ops/jobs"; label: string };
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.flat() : [children];
  const has = items.filter(Boolean).length > 0;
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display font-bold">{title}</h2>
        {link && (
          <Link to={link.to} className="text-xs text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        )}
      </div>
      {has ? (
        <div className="divide-y divide-border">{children}</div>
      ) : (
        <p className="text-sm text-muted-foreground">{empty}</p>
      )}
    </section>
  );
}

function JobRow({
  id,
  time,
  title,
  sub,
  status,
}: {
  id: string;
  time: string;
  title: string;
  sub: string;
  status: string;
}) {
  return (
    <Link
      to="/admin/ops/jobs/$id"
      params={{ id }}
      className="flex items-center gap-3 py-2 hover:opacity-80"
    >
      <span className="font-mono text-xs text-muted-foreground w-12 shrink-0">{time}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium truncate">{title}</span>
        <span className="block text-xs text-muted-foreground truncate">{sub}</span>
      </span>
      <span
        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusTone[status] ?? "bg-muted"}`}
      >
        {status}
      </span>
    </Link>
  );
}
