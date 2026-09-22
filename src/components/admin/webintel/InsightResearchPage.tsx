import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { EstimateBox, WebIntelLayout, useWebIntelOverview } from "./WebIntelLayout";
import { estimateContentResearchCredits, estimateSeoResearchCredits } from "@/lib/web-intel";
import { runInsightResearch } from "@/lib/web-intel.functions";

const SEO_SUGGESTIONS = [
  "Lisbon tuk tuk tours",
  "private tuk tuk Lisbon",
  "Lisbon tours",
  "Sintra private tours",
  "Portugal tours",
];

export function InsightResearchPage({ kind }: { kind: "seo" | "content" }) {
  const { data: overview, refetch } = useWebIntelOverview();
  const usage = overview?.usage;
  const run = useServerFn(runInsightResearch);

  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(3);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const estimate = kind === "seo" ? estimateSeoResearchCredits(pages) : estimateContentResearchCredits(pages);

  const start = async () => {
    setBusy(true);
    try {
      const res = await run({ data: { query: query.trim(), kind, pages } });
      setResult(res.result);
      setConfirming(false);
      toast.success(`Research complete · ${res.creditsUsed} credits used`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Research failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WebIntelLayout
      title={kind === "seo" ? "SEO Research" : "Content Research"}
      description={
        kind === "seo"
          ? "Run a search when you want it — nothing repeats automatically."
          : "Research one topic from a small number of relevant sources."
      }
      usage={usage}
    >
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <label className="block text-sm">
          <span className="font-medium">{kind === "seo" ? "Search term" : "Topic"}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={kind === "seo" ? "Lisbon tuk tuk tours" : "Best things to do in Lisbon"}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          />
        </label>

        {kind === "seo" && (
          <div className="flex flex-wrap gap-2">
            {SEO_SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setQuery(s)} className="rounded-full border px-3 py-1.5 text-xs">
                {s}
              </button>
            ))}
          </div>
        )}

        <label className="block max-w-xs text-sm">
          <span className="font-medium">Pages to read</span>
          <select
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>
                {p} page{p > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        {confirming ? (
          <EstimateBox estimate={estimate} usage={usage} busy={busy} onCancel={() => setConfirming(false)} onStart={start} />
        ) : (
          <button
            type="button"
            disabled={query.trim().length < 3 || usage?.status === "stopped"}
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Research ({estimate} credits estimated)
          </button>
        )}
      </div>

      {result && (
        <div className="grid gap-3 md:grid-cols-2">
          <Block title="Topics" items={result.topics} />
          <Block title="Traveller questions" items={result.questions} />
          <Block title="Content opportunities" items={result.opportunities} />
          {kind === "seo" && <Block title="Potential keywords" items={result.keywords} />}
          {kind === "seo" && <Block title="Competitor pages" items={result.competitor_pages} links />}
          {kind === "content" && <Block title="Useful facts" items={result.facts} />}
          <Block title="Sources" items={result.sources} links />
        </div>
      )}
    </WebIntelLayout>
  );
}

function Block({ title, items, links }: { title: string; items?: string[]; links?: boolean }) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
        {items.map((i, n) => (
          <li key={n}>
            {links && i.startsWith("http") ? (
              <a href={i} target="_blank" rel="noreferrer" className="break-all text-emerald-700 underline">
                {i}
              </a>
            ) : (
              `• ${i}`
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
