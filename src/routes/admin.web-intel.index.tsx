import { createFileRoute, Link } from "@tanstack/react-router";
import { WebIntelLayout, useWebIntelOverview } from "@/components/admin/webintel/WebIntelLayout";
import { STATUS_BADGE } from "@/lib/web-intel";

export const Route = createFileRoute("/admin/web-intel/")({
  component: CommandCenter,
  head: () => ({
    meta: [{ title: "Web Intelligence · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

function Tile({ label, value, tone }: { label: string; value: string | number; tone: string }) {
  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function CommandCenter() {
  const { data, isLoading } = useWebIntelOverview();
  const usage = data?.usage;
  const badge = usage ? STATUS_BADGE[usage.status] : null;

  return (
    <WebIntelLayout title="Command Center" description="Firecrawl · Free Tier" usage={usage}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {!data?.connected && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Firecrawl is not connected yet — research will not run.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Tile label="Credits used" value={usage?.creditsUsed ?? 0} tone="bg-emerald-50 border-emerald-100" />
            <Tile label="Credits remaining" value={usage?.creditsRemaining ?? 0} tone="bg-sky-50 border-sky-100" />
            <Tile label="Searches" value={usage?.searches ?? 0} tone="bg-violet-50 border-violet-100" />
            <Tile label="Pages" value={usage?.pages ?? 0} tone="bg-amber-50 border-amber-100" />
            <Tile label="Research jobs" value={usage?.researchJobs ?? 0} tone="bg-emerald-50 border-emerald-100" />
            <Tile label="Leads found" value={usage?.leadsFound ?? 0} tone="bg-sky-50 border-sky-100" />
          </div>

          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Free Usage Protection</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Monthly limit</dt>
                <dd className="font-medium">{usage?.monthlyLimit ?? 0} credits</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Current usage</dt>
                <dd className="font-medium">
                  {usage?.creditsUsed ?? 0} ({usage?.usagePercent ?? 0}%)
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Remaining allowance</dt>
                <dd className="font-medium">{usage?.creditsRemaining ?? 0} credits</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Automatic stop</dt>
                <dd className="font-medium">
                  {badge?.dot} {badge?.label}
                </dd>
              </div>
            </dl>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${usage?.status === "stopped" ? "bg-rose-500" : usage?.status === "low" ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${usage?.usagePercent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Paid usage is disabled. Research stops automatically when the free allowance runs out — the rest of the
              admin panel keeps working normally.
            </p>
          </div>

          {(data?.pendingLeads ?? 0) > 0 && (
            <Link
              to="/admin/web-intel/leads"
              className="block rounded-xl border bg-card p-4 text-sm font-medium hover:bg-muted"
            >
              🎯 {data?.pendingLeads} discovered leads waiting for your review
            </Link>
          )}

          <div className="overflow-hidden rounded-xl border bg-card">
            <h2 className="border-b p-4 text-sm font-semibold">Recent research</h2>
            {(data?.recentJobs ?? []).length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No research yet.</p>
            ) : (
              <ul className="divide-y">
                {data!.recentJobs.map((j: any) => (
                  <li key={j.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
                    <span className="font-medium">{j.query}</span>
                    <span className="text-xs text-muted-foreground">{j.job_type}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {j.credits_used} credits · {String(j.status).toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </WebIntelLayout>
  );
}
