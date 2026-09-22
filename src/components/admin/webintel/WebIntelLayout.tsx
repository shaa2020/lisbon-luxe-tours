import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { getWebIntelOverview } from "@/lib/web-intel.functions";
import { STATUS_BADGE, type UsageSnapshot } from "@/lib/web-intel";

export const SUB_NAV = [
  { to: "/admin/web-intel", label: "Command Center" },
  { to: "/admin/web-intel/leads", label: "🎯 Lead Finder" },
  { to: "/admin/web-intel/company", label: "🔎 Company Research" },
  { to: "/admin/web-intel/competitor", label: "🏢 Competitor Research" },
  { to: "/admin/web-intel/seo", label: "🔍 SEO Research" },
  { to: "/admin/web-intel/content", label: "✍️ Content Research" },
  { to: "/admin/web-intel/history", label: "📚 Research History" },
  { to: "/admin/web-intel/settings", label: "⚙️ Firecrawl Settings" },
];

export function useWebIntelOverview() {
  const fn = useServerFn(getWebIntelOverview);
  return useQuery({
    queryKey: ["web-intel-overview"],
    queryFn: () => fn({ data: undefined as never }),
    refetchOnWindowFocus: false,
  });
}

export function FreeTierBanner({ usage }: { usage?: UsageSnapshot }) {
  if (!usage) return null;
  const badge = STATUS_BADGE[usage.status];
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border px-4 py-3 text-sm ${badge.tone}`}>
      <span className="font-semibold">🟢 FREE TIER ACTIVE</span>
      <span className="opacity-80">Paid usage is disabled.</span>
      <span className="ml-auto font-medium">
        {badge.dot} {badge.label} · {usage.creditsRemaining} of {usage.monthlyLimit} credits left
      </span>
    </div>
  );
}

export function StopNotice({ usage }: { usage?: UsageSnapshot }) {
  if (!usage || usage.status !== "stopped") return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
      ⛔ Free Firecrawl allowance reached. No additional Firecrawl requests will be made.
    </div>
  );
}

export function EstimateBox({
  estimate,
  usage,
  onCancel,
  onStart,
  busy,
}: {
  estimate: number;
  usage?: UsageSnapshot;
  onCancel: () => void;
  onStart: () => void;
  busy: boolean;
}) {
  const remaining = usage?.creditsRemaining ?? 0;
  const blocked = !usage || estimate > remaining || usage.status === "stopped";
  return (
    <div className="rounded-xl border bg-muted/40 p-4 text-sm">
      <p>
        Estimated Firecrawl usage: <strong>{estimate} credits</strong>
      </p>
      <p>
        Free credits remaining: <strong>{remaining}</strong>
      </p>
      {blocked && (
        <p className="mt-2 font-medium text-rose-600">
          Research cancelled to protect your free Firecrawl allowance.
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 font-medium">
          CANCEL
        </button>
        <button
          type="button"
          disabled={blocked || busy}
          onClick={onStart}
          className="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-40"
        >
          {busy ? "Researching…" : "START RESEARCH"}
        </button>
      </div>
    </div>
  );
}

export function WebIntelLayout({
  title,
  description,
  children,
  usage,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  usage?: UsageSnapshot;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <AdminShell requires="marketing.manage">
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold">🌐 {title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
          {SUB_NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-emerald-600 text-white" : "border bg-card hover:bg-muted"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <FreeTierBanner usage={usage} />
        <StopNotice usage={usage} />
        {children}
      </div>
    </AdminShell>
  );
}
