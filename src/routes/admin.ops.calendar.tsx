import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { supabase } from "@/integrations/supabase/client";
import { tourStageClass, TOUR_STAGE_LABEL, type TourStage } from "@/lib/booking-ledger";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin/ops/calendar")({ component: Page });

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Page() {
  const now = new Date();
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const { data: jobs = [] } = useQuery({
    queryKey: ["ops-calendar-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id,booking_reference,tour_title,customer_name,travel_date,travel_time,guests,status,tour_status,guide_id",
        )
        .order("travel_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter((b) => b.travel_date);
    },
  });
  const { data: staff = [] } = useQuery({
    queryKey: ["ops-staff-min"],
    queryFn: async () =>
      (await supabase.from("ops_staff").select("id,name").order("name")).data ?? [],
  });
  const guideName = (id: string | null) =>
    (staff as any[]).find((s) => s.id === id)?.name ?? "No guide";
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
      const key = j.travel_date as string;
      const list = m.get(key) ?? [];
      list.push(j);
      m.set(key, list);
    }
    return m;
  }, [jobs]);

  const dayJobs = (byDate.get(selected) ?? []).sort((a, b) =>
    (a.travel_time ?? "").localeCompare(b.travel_time ?? ""),
  );

  return (
    <AdminShell requires="ops.view">
      <OpsPage title="Calendar" description="Month view of every real booking.">
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
                    {list.length} tour{list.length > 1 ? "s" : ""}
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
            <p className="text-sm text-muted-foreground">Nothing booked on this day.</p>
          ) : (
            <div className="space-y-2">
              {dayJobs.map((j) => (
                <Link
                  key={j.id}
                  to="/admin/bookings"
                  className="block rounded-xl border border-border bg-card p-3 hover:border-primary/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{(j.travel_time ?? "--:--").slice(0, 5)}</span>
                    <span className="font-semibold truncate">{j.tour_title ?? "Tour"}</span>
                    <span
                      className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border ${tourStageClass(
                        ((j.status || "").toLowerCase() === "cancelled"
                          ? "cancelled"
                          : (j.tour_status || "upcoming")) as TourStage,
                      )}`}
                    >
                      {
                        TOUR_STAGE_LABEL[
                          ((j.status || "").toLowerCase() === "cancelled"
                            ? "cancelled"
                            : (j.tour_status || "upcoming")) as TourStage
                        ]
                      }
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {j.booking_reference ? `${j.booking_reference} · ` : ""}
                    {j.customer_name} · {j.guests} guests · {guideName(j.guide_id)}
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
