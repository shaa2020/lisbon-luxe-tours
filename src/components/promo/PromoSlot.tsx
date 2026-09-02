import { useEffect, useMemo, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  dismissPromo,
  isPromoDismissed,
  isPromotionLive,
  matchesTarget,
  pathAllowsPromotions,
  recordPromoEvent,
  usePublicPromotions,
  type PromoPlacement,
  type Promotion,
} from "@/lib/promotions";
import { PromoView } from "./designs";

/**
 * Renders the highest-priority live campaign for a placement.
 * Handles targeting, dismissal rules and impression / click tracking.
 */
export function PromoSlot({
  placement,
  tourSlug,
  className,
}: {
  placement: PromoPlacement;
  tourSlug?: string | null;
  className?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: promos = [] } = usePublicPromotions();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => setMounted(true), []);

  const promo = useMemo<Promotion | null>(() => {
    if (!mounted || !pathAllowsPromotions(pathname)) return null;
    const list = promos
      .filter((p) => p.placement === placement)
      .filter((p) => isPromotionLive(p))
      .filter((p) => matchesTarget(p, pathname, tourSlug))
      .filter((p) => !dismissed.includes(p.id) && !isPromoDismissed(p))
      .sort((a, b) => b.priority - a.priority);
    return list[0] ?? null;
  }, [promos, placement, pathname, tourSlug, dismissed, mounted]);

  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (promo && seen.current !== promo.id) {
      seen.current = promo.id;
      recordPromoEvent(promo, "impression");
    }
  }, [promo]);

  if (!promo) return null;

  const view = (
    <PromoView
      p={promo}
      onCta={() => recordPromoEvent(promo, "cta_click")}
      onCopy={() => recordPromoEvent(promo, "code_copy")}
      onDismiss={
        promo.dismiss_rule === "never"
          ? undefined
          : () => {
              dismissPromo(promo);
              setDismissed((d) => [...d, promo.id]);
            }
      }
    />
  );

  return className ? <div className={className}>{view}</div> : view;
}

/**
 * Fixed top campaign bar. Publishes its height as `--tt24-top-promo` so the
 * header sits below it and page content shifts down instead of hiding behind.
 */
export function PromoTopBar() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () =>
      document.documentElement.style.setProperty("--tt24-top-promo", `${el.offsetHeight}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.setProperty("--tt24-top-promo", "0px");
    };
  }, []);

  return (
    <div ref={ref} className="fixed top-0 inset-x-0 z-[55]">
      <PromoSlot placement="top" />
    </div>
  );
}
