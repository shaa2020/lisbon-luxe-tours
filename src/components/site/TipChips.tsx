import { useState } from "react";
import { Heart } from "lucide-react";

const PRESETS = [0, 500, 1000, 1500, 2000];

/**
 * Optional gratuity selector shown next to a payment button.
 * The tip is added to this payment only and never changes the tour price.
 */
export function TipChips({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (cents: number) => void;
  className?: string;
}) {
  const isPreset = PRESETS.includes(value);
  const [custom, setCustom] = useState(!isPreset && value > 0);
  const [draft, setDraft] = useState(!isPreset && value > 0 ? String(value / 100) : "");

  const applyCustom = (raw: string) => {
    const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    setDraft(cleaned);
    const num = Number.parseFloat(cleaned);
    onChange(Number.isFinite(num) && num > 0 ? Math.min(100000, Math.round(num * 100)) : 0);
  };

  return (
    <div className={`rounded-xl border border-border bg-cloud/40 p-3 ${className}`}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-body">
        <Heart className="w-3.5 h-3.5 text-gold" strokeWidth={1.75} /> Add a tip for your guide (optional)
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {PRESETS.map((c) => {
          const active = !custom && value === c;
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCustom(false);
                setDraft("");
                onChange(c);
              }}
              className={`rounded-full border py-1.5 text-xs font-semibold transition ${
                active ? "border-gold bg-gold text-white" : "border-ink/15 text-ink hover:border-gold"
              }`}
            >
              {c === 0 ? "No tip" : `€${c / 100}`}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setCustom(true);
            const num = Number.parseFloat(draft);
            onChange(Number.isFinite(num) && num > 0 ? Math.round(num * 100) : 0);
          }}
          className={`rounded-full border py-1.5 text-xs font-semibold transition ${
            custom ? "border-gold bg-gold text-white" : "border-ink/15 text-ink hover:border-gold"
          }`}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">€</span>
          <input
            autoFocus
            type="text"
            inputMode="decimal"
            value={draft}
            onChange={(e) => applyCustom(e.target.value)}
            placeholder="Enter any amount"
            className="flex-1 rounded-lg border border-border bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-gold focus:outline-none"
          />
        </div>
      )}

      {value > 0 && (
        <p className="mt-2 text-xs font-semibold text-ink">
          Tip added: €{(value / 100).toFixed(2)}
        </p>
      )}
      <p className="mt-2 text-[11px] text-body">100% of the tip goes to your guide. You can also tip after the tour.</p>
    </div>
  );
}

/**
 * Plain-language breakdown of exactly what is charged right now,
 * so the guest always sees the tour amount and the tip separately.
 */
export function PaySummary({
  fareLabel,
  fareCents,
  tipCents,
  balanceCents = 0,
  className = "",
}: {
  fareLabel: string;
  fareCents: number;
  tipCents: number;
  balanceCents?: number;
  className?: string;
}) {
  const money = (c: number) => `€${(c / 100).toFixed(2)}`;
  return (
    <div className={`rounded-xl border border-gold/40 bg-gold/5 p-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-body">You are paying today</p>
      <div className="mt-2 space-y-1.5 text-sm">
        <div className="flex justify-between text-ink">
          <span>{fareLabel}</span>
          <span className="tabular-nums">{money(fareCents)}</span>
        </div>
        {tipCents > 0 && (
          <div className="flex justify-between text-ink">
            <span>Tip for your guide</span>
            <span className="tabular-nums">+{money(tipCents)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-gold/30 pt-1.5 font-semibold text-ink">
          <span>Total charged now</span>
          <span className="tabular-nums">{money(fareCents + tipCents)}</span>
        </div>
        {balanceCents > 0 && (
          <div className="flex justify-between text-xs text-body">
            <span>Balance due on the day</span>
            <span className="tabular-nums">{money(balanceCents)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
