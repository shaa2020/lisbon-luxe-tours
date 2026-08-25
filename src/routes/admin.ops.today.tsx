import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { logActivity, opsBookingsQuery } from "@/lib/ops/queries";
import { money, statusTone, todayISO } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/today")({ component: Page });

const QUICK = ["Confirmed", "In Progress", "Completed", "No Show"] as const;

function Page() {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const { data: all = [], isLoading } = useQuery(opsBookingsQuery);
  const jobs = all
    .filter((j) => j.tour_date === date)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ops_bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    await logActivity(id, `Status → ${status}`);
    toast.success(status);
    qc.invalidateQueries({ queryKey: ["ops"] });
  };

  const guests = jobs.reduce((s, j) => s + j.guests, 0);
  const revenue = jobs.reduce((s, j) => s + Number(j.total), 0);

  return (
    <AdminShell>
      <OpsPage
        title="Day sheet"
        description="Run the day: every job in order, with driver, vehicle and pickup."
        actions={
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        }
      >
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Jobs" value={String(jobs.length)} />
          <Stat label="Guests" value={String(guests)} />
          <Stat label="Value" value={money(revenue)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing scheduled on this date.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-display font-bold text-lg">
                        {j.start_time.slice(0, 5)}
                      </span>
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
                      {j.ops_customers?.name ?? "No customer"}
                      {j.ops_customers?.whatsapp ? ` · ${j.ops_customers.whatsapp}` : ""} ·{" "}
                      {j.guests} guests
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pickup: {j.pickup_location || "—"} · Driver: {j.driver?.name ?? "—"} ·
                      Vehicle: {j.ops_vehicles?.name ?? "—"}
                    </p>
                    {j.special_requests && (
                      <p className="text-xs mt-1 text-amber-600">Note: {j.special_requests}</p>
                    )}
                  </div>
                  <Link
                    to="/admin/ops/jobs/$id"
                    params={{ id: j.id }}
                    className="text-xs rounded-md border border-border px-3 py-1.5 hover:bg-accent"
                  >
                    Open job
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {QUICK.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(j.id, s)}
                      className={`px-3 py-1.5 rounded-md text-xs border ${
                        j.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  {j.ops_customers?.whatsapp && (
                    <a
                      href={`https://wa.me/${j.ops_customers.whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-md text-xs border border-border hover:bg-accent"
                    >
                      WhatsApp guest
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </OpsPage>
    </AdminShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="font-display font-bold text-xl mt-1">{value}</p>
    </div>
  );
}
