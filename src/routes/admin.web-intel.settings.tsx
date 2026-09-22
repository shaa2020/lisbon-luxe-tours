import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { WebIntelLayout, useWebIntelOverview } from "@/components/admin/webintel/WebIntelLayout";
import { updateWebIntelSettings } from "@/lib/web-intel.functions";

export const Route = createFileRoute("/admin/web-intel/settings")({
  component: FirecrawlSettings,
  head: () => ({
    meta: [{ title: "Firecrawl settings · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

function FirecrawlSettings() {
  const { data, refetch } = useWebIntelOverview();
  const usage = data?.usage;
  const save = useServerFn(updateWebIntelSettings);
  const [limit, setLimit] = useState("500");
  const [threshold, setThreshold] = useState("80");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (usage) {
      setLimit(String(usage.monthlyLimit));
      setThreshold(String(usage.lowThresholdPercent));
    }
  }, [usage?.monthlyLimit, usage?.lowThresholdPercent]);

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          monthly_credit_limit: Number(limit) || 0,
          low_threshold_percent: Number(threshold) || 80,
        },
      });
      toast.success("Saved");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <WebIntelLayout title="Firecrawl Settings" description="Free-tier protection" usage={usage}>
      <div className="max-w-lg space-y-4 rounded-xl border bg-card p-4">
        <label className="block text-sm">
          <span className="font-medium">Monthly free credit allowance</span>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          />
          <span className="text-xs text-muted-foreground">
            Research stops automatically once this many credits are used in a calendar month.
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium">Warn me at (% of allowance)</span>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2"
          />
        </label>

        <div className="rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Paid usage is disabled.</p>
          <p className="text-muted-foreground">
            The system never switches to paid Firecrawl usage and never runs research in the background — every job is
            started by you.
          </p>
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </WebIntelLayout>
  );
}
