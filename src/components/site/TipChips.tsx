import { Heart } from "lucide-react";

const PRESETS = [0, 300, 500, 1000];

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
  return (
    <div className={`rounded-xl border border-border bg-cloud/40 p-3 ${className}`}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-body">
        <Heart className="w-3.5 h-3.5 text-gold" strokeWidth={1.75} /> Add a tip for your guide (optional)
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-full border py-1.5 text-xs font-semibold transition ${
              value === c ? "border-gold bg-gold text-white" : "border-ink/15 text-ink hover:border-gold"
            }`}
          >
            {c === 0 ? "No tip" : `€${c / 100}`}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-body">100% of the tip goes to your guide. You can also tip after the tour.</p>
    </div>
  );
}
