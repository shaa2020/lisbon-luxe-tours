import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { opsBookingsQuery } from "@/lib/ops/queries";
import { statusTone } from "@/lib/ops/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/ops/calendar")({ component: Page });

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Page() {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const { data: jobs = [] } = useQuery(opsBookingsQuery);
  const [selected, setSelected] = useState<string>(iso(now));

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [month]);

  const byDate = useMemo(() => {
    const m = new Map<string, typeof jobs>();
    for (const j of jobs) {
      const list = m.get(j.tour_date) ?? [];
      list.push(j);
      m.set(j.tour_date, list);
    }
    return m;
  }, [jobs]);

  const dayJobs = (byDate.get(selected) ?? []).sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );

  return (
    <AdminShell>
      <OpsPage title="Calendar" description="Month view of everything booked.">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="w-9 h-9 grid place-items-center rounded-md border border-border hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="font-display font-bold">
            {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="w-9 h-9 grid place-items-center rounded-md border border-border hover:bg-accent"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d) => {
            const key = iso(d);
            const list = byDate.get(key) ?? [];
            const other = d.getMonth() !== month.getMonth();
            return (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`aspect-square rounded-lg border p-1 text-left transition ${
                  selected === key ? "border-primary bg-primary/10" : "border-border bg-card"
                } ${other ? "opacity-40" : ""}`}
              >
                <span className="text-xs font-medium">{d.getDate()}</span>
                {list.length > 0 && (
                  <span className="block mt-0.5 text-[10px] font-bold text-primary">
                    {list.length} job{list.length > 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <h2 className="font-display font-bold mb-2">
            {new Date(selected).toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h2>
          {dayJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs on this day.</p>
          ) : (
            <div className="space-y-2">
              {dayJobs.map((j) => (
                <Link
                  key={j.id}
                  to="/admin/ops/jobs/$id"
                  params={{ id: j.id }}
                  className="block rounded-xl border border-border bg-card p-3 hover:border-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{j.start_time.slice(0, 5)}</span>
                    <span className="font-semibold truncate">{j.tour_name}</span>
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[j.status] ?? "bg-muted"}`}
                    >
                      {j.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {j.ops_customers?.name ?? "No customer"} · {j.guests} guests ·{" "}
                    {j.driver?.name ?? "No driver"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </OpsPage>
    </AdminShell>
  );
}
