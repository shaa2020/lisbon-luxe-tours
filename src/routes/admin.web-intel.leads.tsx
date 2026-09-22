import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EstimateBox,
  WebIntelLayout,
  useWebIntelOverview,
} from "@/components/admin/webintel/WebIntelLayout";
import {
  LEAD_COUNT_OPTIONS,
  LEAD_TYPES,
  SEARCH_MODES,
  TARGET_MARKETS,
  estimateLeadJobCredits,
  type SearchMode,
} from "@/lib/web-intel";
import {
  importResearchLead,
  listResearchLeads,
  runLeadSearch,
  setResearchLeadStatus,
} from "@/lib/web-intel.functions";

export const Route = createFileRoute("/admin/web-intel/leads")({
  component: LeadFinder,
  head: () => ({
    meta: [{ title: "Lead Finder · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

function LeadFinder() {
  const { data: overview, refetch: refetchOverview } = useWebIntelOverview();
  const usage = overview?.usage;

  const [markets, setMarkets] = useState<string[]>(["eu"]);
  const [types, setTypes] = useState<string[]>(["Travel agencies"]);
  const [mode, setMode] = useState<SearchMode>("quick");
  const [count, setCount] = useState<number>(10);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = useServerFn(runLeadSearch);
  const listFn = useServerFn(listResearchLeads);
  const importFn = useServerFn(importResearchLead);
  const statusFn = useServerFn(setResearchLeadStatus);

  const leads = useQuery({
    queryKey: ["research-leads"],
    queryFn: () => listFn({ data: { status: "new" } }),
    refetchOnWindowFocus: false,
  });

  const estimate = useMemo(() => estimateLeadJobCredits(count, mode), [count, mode]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const start = async () => {
    setBusy(true);
    try {
      const res = await run({ data: { markets, leadTypes: types, leadCount: count, mode } });
      toast.success(`${res.leads} leads found · ${res.creditsUsed} credits used`);
      setConfirming(false);
      leads.refetch();
      refetchOverview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  };

  const act = async (id: string, action: "import" | "ignore") => {
    try {
      if (action === "ignore") {
        await statusFn({ data: { id, status: "ignored" } });
        toast.success("Ignored");
      } else {
        const res = await importFn({ data: { id } });
        if (res.duplicate) toast.warning("⚠️ Duplicate — this company is already in your CRM");
        else toast.success("Added to CRM");
      }
      leads.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <WebIntelLayout title="Lead Finder" description="Find travel-trade partners who can send guests to Lisbon" usage={usage}>
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Target markets</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TARGET_MARKETS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => toggle(markets, setMarkets, m.value)}
                className={`rounded-full px-3 py-1.5 text-sm ${markets.includes(m.value) ? "bg-emerald-600 text-white" : "border"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium">Lead types</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LEAD_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(types, setTypes, t)}
                className={`rounded-full px-3 py-1.5 text-sm ${types.includes(t) ? "bg-emerald-600 text-white" : "border"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Search mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as SearchMode)}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            >
              {SEARCH_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.description}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Leads in this batch</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            >
              {LEAD_COUNT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c} leads
                </option>
              ))}
            </select>
          </label>
        </div>

        {confirming ? (
          <EstimateBox
            estimate={estimate}
            usage={usage}
            busy={busy}
            onCancel={() => setConfirming(false)}
            onStart={start}
          />
        ) : (
          <button
            type="button"
            disabled={!markets.length || !types.length || usage?.status === "stopped"}
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Find leads ({estimate} credits estimated)
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-sm font-semibold">Review discovered leads</h2>
          <span className="text-xs text-muted-foreground">Nothing is added to the CRM until you approve it</span>
        </div>
        {leads.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : (leads.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No leads waiting for review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Company</th>
                  <th className="p-3">Country</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Website</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Relevance</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(leads.data ?? []).map((l: any) => (
                  <tr key={l.id} className="align-top">
                    <td className="p-3 font-medium">{l.company}</td>
                    <td className="p-3">{l.country ?? "Not found"}</td>
                    <td className="p-3">{l.business_type ?? "Not found"}</td>
                    <td className="p-3">
                      {l.website ? (
                        <a href={l.website} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
                          {l.domain ?? l.website}
                        </a>
                      ) : (
                        "Not found"
                      )}
                    </td>
                    <td className="p-3">{l.email ?? "Not found"}</td>
                    <td className="p-3">{l.phone ?? "Not found"}</td>
                    <td className="p-3">{l.lisbon_relevance ?? l.portugal_relevance ?? "Not found"}</td>
                    <td className="max-w-[260px] p-3 text-xs text-muted-foreground">{l.reason ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => act(l.id, "import")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Add to CRM
                        </button>
                        <button
                          type="button"
                          onClick={() => act(l.id, "ignore")}
                          className="rounded-lg border px-3 py-1.5 text-xs"
                        >
                          Ignore
                        </button>
                        {l.source_url && (
                          <a
                            href={l.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border px-3 py-1.5 text-xs"
                          >
                            View source
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </WebIntelLayout>
  );
}
