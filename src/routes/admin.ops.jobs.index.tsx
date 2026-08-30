import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { opsBookingsQuery } from "@/lib/ops/queries";
import { BOOKING_STATUSES, money, statusTone } from "@/lib/ops/types";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/admin/ops/jobs/")({ component: Page });

function Page() {
  const { data: jobs = [], isLoading } = useQuery(opsBookingsQuery);
  const [status, setStatus] = useState<string>("All");
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      jobs.filter((j) => {
        if (status !== "All" && j.status !== status) return false;
        if (!q.trim()) return true;
        const hay = `${j.reference} ${j.tour_name} ${j.ops_customers?.name ?? ""} ${j.pickup_location ?? ""}`;
        return hay.toLowerCase().includes(q.trim().toLowerCase());
      }),
    [jobs, status, q],
  );

  return (
    <AdminShell requires="ops.view">
      <OpsPage
        title="Jobs"
        description="Every operational job — from first enquiry to completed tour."
        actions={
          <Link
            to="/admin/ops/jobs/$id"
            params={{ id: "new" }}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> New job
          </Link>
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, guest, tour…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm max-w-xs w-full"
          />
          <div className="flex gap-1.5 overflow-x-auto">
            {["All", ...BOOKING_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-2 rounded-md text-xs whitespace-nowrap border ${
                  status === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs match this filter.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((j) => (
              <Link
                key={j.id}
                to="/admin/ops/jobs/$id"
                params={{ id: j.id }}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-muted-foreground">{j.reference}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[j.status] ?? "bg-muted"}`}
                  >
                    {j.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[j.payment_status] ?? "bg-muted"}`}
                  >
                    {j.payment_status}
                  </span>
                </div>
                <p className="font-semibold">{j.tour_name}</p>
                <p className="text-sm text-muted-foreground">
                  {j.tour_date} · {j.start_time?.slice(0, 5)} · {j.guests} guests ·{" "}
                  {j.ops_customers?.name ?? "No customer"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {j.driver?.name ? `Driver ${j.driver.name}` : "No driver"} ·{" "}
                  {j.ops_vehicles?.name ?? "No vehicle"} · {money(j.total, j.currency)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </OpsPage>
    </AdminShell>
  );
}
