import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = 18,
  readOnly = false,
  className,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
  className?: string;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {stars.map((s) => {
        const filled = s <= Math.round(value);
        const Cmp = readOnly ? "span" : "button";
        return (
          <Cmp
            key={s}
            type={readOnly ? undefined : ("button" as never)}
            onClick={readOnly ? undefined : () => onChange?.(s)}
            className={cn(
              "transition",
              !readOnly && "hover:scale-110 cursor-pointer",
            )}
            aria-label={readOnly ? `${value} out of 5` : `Rate ${s} star${s === 1 ? "" : "s"}`}
          >
            <Star
              width={size}
              height={size}
              className={cn(
                filled ? "fill-gold text-gold" : "fill-transparent text-ink/25",
              )}
            />
          </Cmp>
        );
      })}
    </div>
  );
}
