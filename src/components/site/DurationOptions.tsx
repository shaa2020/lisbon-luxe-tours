import { cn } from "@/lib/utils";
import { optionBadgeLabel, optionPrice, type TourOption } from "@/lib/tour-options";

/**
 * Premium, mobile-first duration picker shown only for tours that have
 * multiple duration options configured in the admin panel.
 */
export function DurationOptions({
  options,
  selectedId,
  onSelect,
  compact = false,
}: {
  options: TourOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {options.map((o) => {
        const selected = o.id === selectedId;
        const badge = optionBadgeLabel(o);
        const price = optionPrice(o);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(o.id)}
            className={cn(
              "w-full text-left rounded-[4px] border px-4 py-3.5 transition-all duration-200",
              selected
                ? "border-gold bg-gold/5 shadow-[0_2px_10px_rgba(43,182,247,0.15)]"
                : "border-border bg-paper hover:border-gold/60",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 w-4 h-4 shrink-0 rounded-full border flex items-center justify-center transition-colors",
                  selected ? "border-gold" : "border-body/50",
                )}
              >
                {selected && <span className="w-2 h-2 rounded-full bg-gold" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{o.durationLabel}</span>
                  {badge && (
                    <span className="px-2 py-0.5 rounded-full bg-gold/12 text-gold text-[9px] font-bold uppercase tracking-widest">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="mt-1 flex items-baseline gap-2">
                  <span className="text-sm text-ink font-medium">€{price}</span>
                  {o.salePrice != null && (
                    <span className="text-[11px] text-body line-through">€{o.price}</span>
                  )}
                  <span className="text-[11px] text-body">per person</span>
                </span>
                {o.shortDescription && (
                  <span className="mt-1 block text-[11px] leading-relaxed text-body">
                    {o.shortDescription}
                  </span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
