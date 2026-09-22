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
  LEAD_AUDIENCES,
  LEAD_COUNT_OPTIONS,
  LEAD_TYPES,
  SEARCH_MODES,
  TARGET_MARKETS,
  TRAVELLER_INTENTS,
  TRAVELLER_SOURCES,
  estimateLeadJobCredits,
  type LeadAudience,
  type SearchMode,
} from "@/lib/web-intel";
import {
  importResearchLead,
  listResearchLeads,
  runLeadSearch,
  runTravellerSearch,
  setResearchLeadStatus,
} from "@/lib/web-intel.functions";

export const Route = createFileRoute("/admin/web-intel/leads")({
  component: LeadFinder,
  head: () => ({
    meta: [{ title: "Lead Finder · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

const RECENCY = [
  { value: "qdr:w", label: "Posted in the last week" },
  { value: "qdr:m", label: "Posted in the last month" },
  { value: "qdr:y", label: "Posted in the last year" },
] as const;

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-emerald-600 text-white" : "border"}`}
    >
      {children}
    </button>
  );
}

function LeadFinder() {
  const { data: overview, refetch: refetchOverview } = useWebIntelOverview();
  const usage = overview?.usage;

  const [audience, setAudience] = useState<LeadAudience>("traveller");

  // Partner (B2B) filters
  const [markets, setMarkets] = useState<string[]>(["eu"]);
  const [types, setTypes] = useState<string[]>(["Travel agencies"]);

  // Traveller (B2C) filters
  const [intents, setIntents] = useState<string[]>(["Tuk tuk tour in Lisbon"]);
  const [sources, setSources] = useState<string[]>(["reddit", "forums"]);
  const [extra, setExtra] = useState("");
  const [recency, setRecency] = useState<(typeof RECENCY)[number]["value"]>("qdr:m");

  const [mode, setMode] = useState<SearchMode>("quick");
  const [count, setCount] = useState<number>(10);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const runPartners = useServerFn(runLeadSearch);
  const runTravellers = useServerFn(runTravellerSearch);
  const listFn = useServerFn(listResearchLeads);
  const importFn = useServerFn(importResearchLead);
  const statusFn = useServerFn(setResearchLeadStatus);

  const leads = useQuery({
    queryKey: ["research-leads", audience],
    queryFn: () => listFn({ data: { status: "new", audience } }),
    refetchOnWindowFocus: false,
  });

  const estimate = useMemo(() => estimateLeadJobCredits(count, mode), [count, mode]);

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const ready =
    audience === "partner" ? markets.length > 0 && types.length > 0 : intents.length > 0 && sources.length > 0;

  const start = async () => {
    setBusy(true);
    try {
      const res =
        audience === "partner"
          ? await runPartners({ data: { markets, leadTypes: types, leadCount: count, mode } })
          : await runTravellers({
              data: {
                intents,
                sources,
                extra: extra.trim() || undefined,
                recency,
                leadCount: count,
                mode,
              },
            });
      toast.success(`${res.leads} found · ${res.creditsUsed} credits used`);
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
        if (res.duplicate) toast.warning("⚠️ Duplicate — this one is already in your CRM");
        else toast.success("Added to CRM");
      }
      leads.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const isTraveller = audience === "traveller";

  return (
    <WebIntelLayout
      title="Lead Finder"
      description="Find travellers asking for a Lisbon tour, or travel businesses who can send you guests"
      usage={usage}
    >
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-medium">Who am I looking for?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {LEAD_AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => {
                  setAudience(a.value);
                  setConfirming(false);
                }}
                className={`rounded-xl border p-3 text-left text-sm ${
                  audience === a.value ? "border-emerald-500 bg-emerald-50" : "hover:bg-muted"
                }`}
              >
                <span className="font-medium">{a.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{a.description}</span>
              </button>
            ))}
          </div>
        </div>

        {isTraveller ? (
          <>
            <div>
              <p className="text-sm font-medium">What are they asking for?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAVELLER_INTENTS.map((t) => (
                  <Chip key={t} on={intents.includes(t)} onClick={() => toggle(intents, setIntents, t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium">Where to look</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TRAVELLER_SOURCES.map((s) => (
                  <Chip key={s.value} on={sources.includes(s.value)} onClick={() => toggle(sources, setSources, s.value)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Only public posts are read. No private profiles, no personal emails or phone numbers are collected —
                you reply to the person where they posted.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium">Anything extra (optional)</span>
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="e.g. cruise passengers, October, wheelchair"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium">How recent</span>
                <select
                  value={recency}
                  onChange={(e) => setRecency(e.target.value as typeof recency)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
                >
                  {RECENCY.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium">Target markets</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TARGET_MARKETS.map((m) => (
                  <Chip key={m.value} on={markets.includes(m.value)} onClick={() => toggle(markets, setMarkets, m.value)}>
                    {m.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Lead types</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LEAD_TYPES.map((t) => (
                  <Chip key={t} on={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}

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
            <span className="font-medium">How many in this batch</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
            >
              {LEAD_COUNT_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
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
            disabled={!ready || usage?.status === "stopped"}
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {isTraveller ? "Find travellers" : "Find partners"} ({estimate} credits estimated)
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="text-sm font-semibold">
            Review {isTraveller ? "travellers asking for a tour" : "discovered partners"}
          </h2>
          <span className="text-xs text-muted-foreground">Nothing is added to the CRM until you approve it</span>
        </div>
        {leads.isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading…</p>
        ) : (leads.data ?? []).length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nothing waiting for review.</p>
        ) : isTraveller ? (
          <ul className="divide-y">
            {(leads.data ?? []).map((l: any) => (
              <li key={l.id} className="space-y-2 p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.company}</span>
                  {l.platform && <span className="rounded-full border px-2 py-0.5 text-xs">{l.platform}</span>}
                  {l.posted_at && <span className="text-xs text-muted-foreground">{l.posted_at}</span>}
                  {typeof l.relevance_score === "number" && (
                    <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {l.relevance_score}/100
                    </span>
                  )}
                </div>
                <p>{l.request_summary ?? "Not found"}</p>
                <p className="text-xs text-muted-foreground">
                  Dates: {l.travel_dates ?? "Not found"} · Group: {l.group_size ?? "Not found"} · From:{" "}
                  {l.country ?? "Not found"}
                </p>
                {l.reason && <p className="text-xs text-muted-foreground">Why: {l.reason}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => act(l.id, "import")}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Add to CRM
                  </button>
                  <button type="button" onClick={() => act(l.id, "ignore")} className="rounded-lg border px-3 py-1.5 text-xs">
                    Ignore
                  </button>
                  {l.source_url && (
                    <a
                      href={l.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border px-3 py-1.5 text-xs"
                    >
                      Open the post & reply
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
