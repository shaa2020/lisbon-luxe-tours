import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { opsRequestsQuery } from "@/lib/ops/queries";
import { REQUEST_STATUSES, statusTone } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/requests")({ component: Page });

function Page() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery(opsRequestsQuery);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("ops_change_requests").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["ops", "requests"] });
  };

  return (
    <AdminShell requires="ops.view">
      <OpsPage
        title="Guest requests"
        description="Change, cancellation and question requests raised against jobs."
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                    {r.request_type}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusTone[r.status] ?? "bg-muted"}`}
                  >
                    {r.status}
                  </span>
                  {r.ops_bookings && (
                    <span className="text-xs text-muted-foreground">
                      {r.ops_bookings.reference} · {r.ops_bookings.tour_name} ·{" "}
                      {r.ops_bookings.tour_date}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.message}</p>
                <div className="flex gap-1.5 mt-3">
                  {REQUEST_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(r.id, s)}
                      className={`px-3 py-1.5 rounded-md text-xs border ${
                        r.status === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:bg-accent"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </OpsPage>
    </AdminShell>
  );
}
