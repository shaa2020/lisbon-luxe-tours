import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WebIntelLayout, useWebIntelOverview } from "@/components/admin/webintel/WebIntelLayout";
import { listResearchJobs } from "@/lib/web-intel.functions";

export const Route = createFileRoute("/admin/web-intel/history")({
  component: History,
  head: () => ({
    meta: [{ title: "Research history · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

const TYPES = [
  { value: "all", label: "All" },
  { value: "lead_finder", label: "Lead finder" },
  { value: "company", label: "Company" },
  { value: "competitor", label: "Competitor" },
  { value: "seo", label: "SEO" },
  { value: "content", label: "Content" },
];

function History() {
  const { data: overview } = useWebIntelOverview();
  const [type, setType] = useState("all");
  const fn = useServerFn(listResearchJobs);
  const jobs = useQuery({
    queryKey: ["research-jobs", type],
    queryFn: () => fn({ data: { type } }),
    refetchOnWindowFocus: false,
  });

  return (
    <WebIntelLayout title="Research History" description="Every research job you have run" usage={overview?.usage}>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`rounded-full px-3 py-1.5 text-sm ${type === t.value ? "bg-emerald-600 text-white" : "border"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {jobs.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : (jobs.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No research yet.</p>
        ) : (
          <ul className="divide-y">
            {(jobs.data ?? []).map((j: any) => (
              <li key={j.id} className="p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{j.query}</span>
                  <span className="rounded-full border px-2 py-0.5 text-xs">{j.job_type}</span>
                  {j.mode && <span className="rounded-full border px-2 py-0.5 text-xs">{j.mode}</span>}
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${
                      j.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : j.status === "failed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {String(j.status).toUpperCase()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(j.created_at).toLocaleString()} · {j.credits_used} credits · {j.searches} searches ·{" "}
                  {j.pages} pages · {j.leads_found} leads · {(j.sources ?? []).length} sources
                </p>
                {j.error && <p className="mt-1 text-xs text-rose-600">{j.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </WebIntelLayout>
  );
}
