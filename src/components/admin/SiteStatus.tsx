import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { getSiteStatus, runSiteCheckNow } from "@/lib/site-status.functions";

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

export function SiteStatus() {
  const fetchStatus = useServerFn(getSiteStatus);
  const checkNow = useServerFn(runSiteCheckNow);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["site-status"], queryFn: () => fetchStatus(), refetchInterval: 60_000 });
  const m = useMutation({
    mutationFn: () => checkNow(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-status"] }),
  });

  const sites = q.data ?? [];
  const anyDown = sites.some((s) => s.latest && !s.latest.ok);

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" strokeWidth={2} />
          <h3 className="text-sm font-semibold">Website status</h3>
          {sites.length > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${anyDown ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              {anyDown ? "Problem detected" : "All online"}
            </span>
          )}
        </div>
        <button
          onClick={() => m.mutate()}
          disabled={m.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${m.isPending ? "animate-spin" : ""}`} /> Check now
        </button>
      </div>
      {q.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {sites.map((s) => {
            const l = s.latest;
            return (
              <li key={s.url} className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3">
                {!l ? (
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                ) : l.ok ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                )}
                <div className="min-w-0 text-xs">
                  <p className="font-semibold truncate">{new URL(s.url).host}</p>
                  <p className="text-muted-foreground">
                    {!l ? "Not checked yet" : l.ok ? `Online · ${l.response_ms} ms` : `Offline · ${l.error ?? "no response"}`}
                    {l && ` · ${ago(l.checked_at)}`}
                  </p>
                  {s.uptime24h != null && (
                    <p className="text-muted-foreground">
                      Uptime 24h: {s.uptime24h}%{s.lastDown ? ` · last issue ${ago(s.lastDown)}` : ""}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">Checked every 5 minutes. You get a phone notification if the site goes down and when it's back.</p>
    </section>
  );
}
