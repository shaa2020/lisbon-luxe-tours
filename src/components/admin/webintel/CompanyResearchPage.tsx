import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { EstimateBox, WebIntelLayout, useWebIntelOverview } from "./WebIntelLayout";
import { estimateCompanyResearchCredits } from "@/lib/web-intel";
import { runCompanyResearch } from "@/lib/web-intel.functions";

export function CompanyResearchPage({ kind }: { kind: "company" | "competitor" }) {
  const { data: overview, refetch } = useWebIntelOverview();
  const usage = overview?.usage;
  const run = useServerFn(runCompanyResearch);

  const [input, setInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const estimate = estimateCompanyResearchCredits();

  const start = async () => {
    setBusy(true);
    try {
      const res = await run({ data: { input: input.trim(), kind } });
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

  const title = kind === "competitor" ? "Competitor Research" : "Company Research";

  return (
    <WebIntelLayout
      title={title}
      description={
        kind === "competitor"
          ? "Look up one competitor, only when you ask for it — nothing is monitored automatically."
          : "Research one company by name or website address."
      }
      usage={usage}
    >
      <div className="space-y-4 rounded-xl border bg-card p-4">
        <label className="block text-sm">
          <span className="font-medium">{kind === "competitor" ? "Competitor website" : "Company name or website"}</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={kind === "competitor" ? "https://example.com" : "Lisbon Travel Co or example.com"}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          />
        </label>

        {confirming ? (
          <EstimateBox estimate={estimate} usage={usage} busy={busy} onCancel={() => setConfirming(false)} onStart={start} />
        ) : (
          <button
            type="button"
            disabled={input.trim().length < 3 || usage?.status === "stopped"}
            onClick={() => setConfirming(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            Research ({estimate} credits estimated)
          </button>
        )}
      </div>

      {result && (
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <h2 className="text-base font-semibold">{result.company}</h2>
          <p className="text-muted-foreground">{result.description}</p>
          <Field label="Website" value={result.website} link />
          <ListField label="Tourism services" values={result.tourism_services} />
          <ListField label="Locations served" values={result.locations_served} />
          <Field label="Portugal relevance" value={result.portugal_relevance} />
          <Field label="Lisbon relevance" value={result.lisbon_relevance} />
          <Field label="Public email" value={result.email} />
          <Field label="Public phone" value={result.phone} />
          <Field label="Contact page" value={result.contact_page} link />
          <Field label="Partnership opportunity" value={result.partnership_opportunity} />
        </div>
      )}
    </WebIntelLayout>
  );
}

function Field({ label, value, link }: { label: string; value?: string; link?: boolean }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {link && value.startsWith("http") ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-emerald-700 underline">
          {value}
        </a>
      ) : (
        value
      )}
    </p>
  );
}

function ListField({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  return (
    <p>
      <span className="font-medium">{label}: </span>
      {values.join(", ")}
    </p>
  );
}
