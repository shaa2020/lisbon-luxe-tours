import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { opsAllPaymentsQuery, opsBookingsQuery } from "@/lib/ops/queries";
import { money } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/payments")({ component: Page });

function Page() {
  const { data: payments = [], isLoading } = useQuery(opsAllPaymentsQuery);
  const { data: bookings = [] } = useQuery(opsBookingsQuery);

  const collected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const live = bookings.filter((b) => b.status !== "Cancelled");
  const billed = live.reduce((s, b) => s + Number(b.total), 0);
  const outstanding = Math.max(0, billed - collected);

  return (
    <AdminShell>
      <OpsPage title="Payments" description="Every payment recorded against an operations job.">
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Stat label="Collected" value={money(collected)} />
          <Stat label="Billed" value={money(billed)} />
          <Stat label="Outstanding" value={money(outstanding)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payments recorded yet. Record them from a job's page.
          </p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {p.ops_bookings?.reference ?? "—"} · {p.ops_bookings?.tour_name ?? ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.paid_at).toLocaleString()} · {p.method}
                    {p.notes ? ` · ${p.notes}` : ""}
                  </p>
                </div>
                <span className="font-display font-bold whitespace-nowrap">
                  {money(p.amount, p.ops_bookings?.currency ?? "EUR")}
                </span>
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
