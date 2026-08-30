import { useEffect, useMemo, useState } from "react";

export type HeroSlideItem = { label: string; image_url?: string | null };

export const HERO_SLIDE_INTERVAL_MS = 5500;

/**
 * Crossfading hero slideshow.
 *
 * Every slide is mounted as its own stacked layer so the browser has already
 * decoded the next image before it fades in — no hard cut, no skeleton flash
 * between slides. Only the database URLs are used as sources.
 */
export function HeroSlideshow({
  slides,
  activeIndex,
  className = "",
  eager = true,
}: {
  slides: HeroSlideItem[];
  activeIndex: number;
  className?: string;
  eager?: boolean;
}) {
  const usable = useMemo(() => slides.filter((s) => !!s.image_url), [slides]);
  const active = usable.length ? activeIndex % usable.length : 0;

  return (
    <div className={`absolute inset-0 overflow-hidden bg-ink ${className}`} aria-hidden="true">
      {usable.map((slide, i) => (
        <img
          key={`${slide.image_url}-${i}`}
          src={slide.image_url as string}
          alt=""
          loading={eager && i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "low"}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[opacity,transform]"
          style={{
            opacity: i === active ? 1 : 0,
            transform: i === active ? "scale(1.04)" : "scale(1)",
            transitionProperty: "opacity, transform",
            transitionDuration: "1200ms, 7000ms",
          }}
        />
      ))}
    </div>
  );
}

/** Auto-advancing index for a slideshow, paused when the tab is hidden. */
export function useSlideRotation(count: number, intervalMs = HERO_SLIDE_INTERVAL_MS) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [index, count]);

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  return [index, setIndex] as const;
}
