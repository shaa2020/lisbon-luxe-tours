import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2 } from "lucide-react";
import { createTipPayment } from "@/lib/tips.functions";

const PRESETS = [500, 1000, 2000];

/**
 * Post-tour gratuity card shown on the guest's private tour page.
 * A tip is separate money for the guide: it never changes the tour balance.
 */
export function TipCard({
  token,
  guideName,
  tippedCents,
}: {
  token: string;
  guideName?: string | null;
  tippedCents?: number;
}) {
  const startTip = useServerFn(createTipPayment);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pay(amountCents: number) {
    if (!amountCents || amountCents < 100) {
      setError("Please enter at least €1.");
      return;
    }
    setError(null);
    setBusy(amountCents);
    try {
      const res = await startTip({ data: { token, amount_cents: amountCents } });
      if (res?.url) window.location.href = res.url;
      else setError("We couldn't open the payment page. Please try again.");
    } catch (e: any) {
      setError(e?.message || "We couldn't start the payment. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="bg-background border border-border rounded-2xl p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-body mb-3">
        <Heart className="w-4 h-4 text-gold" strokeWidth={1.75} /> Tip your guide
      </h2>
      <p className="text-sm text-body">
        {guideName
          ? `100% of your tip goes straight to ${guideName}.`
          : "100% of your tip goes straight to your guide."}
        {tippedCents && tippedCents > 0 ? ` You've already tipped €${(tippedCents / 100).toFixed(2)} — thank you!` : ""}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => pay(c)}
            disabled={busy !== null}
            className="rounded-full border border-ink/20 py-2.5 text-sm font-semibold text-ink hover:border-gold disabled:opacity-50"
          >
            {busy === c ? <Loader2 className="w-4 h-4 animate-spin mx-auto" strokeWidth={1.75} /> : `€${c / 100}`}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          inputMode="decimal"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Other amount (€)"
          className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm text-ink"
        />
        <button
          type="button"
          onClick={() => pay(Math.round(parseFloat(custom.replace(",", ".")) * 100))}
          disabled={busy !== null || !custom}
          className="rounded-full bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-50"
        >
          Tip
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </section>
  );
}
