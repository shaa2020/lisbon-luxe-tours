import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type PromoPlacement =
  | "top"
  | "bottom"
  | "home_hero"
  | "home_tours"
  | "tour_page"
  | "tour_card"
  | "overlay";

export type PromoTarget = "all" | "home" | "tours" | "tour" | "checkout";

export type DismissRule = "forever" | "session" | "days" | "never";

export type Promotion = {
  id: string;
  name: string;
  design: string;
  placement: PromoPlacement;
  target: PromoTarget;
  target_slug: string | null;
  headline: string;
  subtext: string | null;
  code: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  badge_text: string | null;
  priority: number;
  dismiss_rule: DismissRule;
  dismiss_days: number;
  starts_at: string | null;
  ends_at: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PromoDesign = {
  id: string;
  label: string;
  family: "bar" | "inline" | "overlay";
  hint: string;
};

/** The full design gallery. Every id maps to a component in components/promo/designs. */
export const PROMO_DESIGNS: PromoDesign[] = [
  { id: "classic_gold", label: "Classic Gold", family: "bar", hint: "Flat gold bar, bold headline" },
  { id: "ink_night", label: "Ink Night", family: "bar", hint: "Deep navy with a gold code pill" },
  { id: "sunset_gradient", label: "Sunset Gradient", family: "bar", hint: "Lisbon sunset gradient" },
  { id: "marquee", label: "Marquee", family: "bar", hint: "Slow scrolling ticker" },
  { id: "ticket_stub", label: "Ticket Stub", family: "bar", hint: "Dashed edges, perforated code" },
  { id: "countdown", label: "Countdown Bar", family: "bar", hint: "Live timer to the end date" },
  { id: "minimal_rule", label: "Minimal Rule", family: "bar", hint: "Hairline, text only" },
  { id: "split_colour", label: "Split Colour", family: "bar", hint: "Two-tone with arrow CTA" },
  { id: "tile_pattern", label: "Tile Pattern", family: "bar", hint: "Subtle azulejo backdrop" },
  { id: "glass", label: "Glass", family: "bar", hint: "Blurred translucent bar" },
  { id: "feature_card", label: "Feature Card", family: "inline", hint: "Image left, text right" },
  { id: "coupon_card", label: "Coupon Card", family: "inline", hint: "Big dashed code, copy button" },
  { id: "poster_strip", label: "Poster Strip", family: "inline", hint: "Full-width photo overlay" },
  { id: "stat_ribbon", label: "Stat Ribbon", family: "inline", hint: "Headline plus proof points" },
  { id: "duo_split", label: "Duo Split", family: "inline", hint: "Headline next to code block" },
  { id: "editorial", label: "Editorial", family: "inline", hint: "Serif headline, quiet CTA" },
  { id: "corner_pill", label: "Corner Pill", family: "overlay", hint: "Small floating pill" },
  { id: "slide_in", label: "Slide-in Card", family: "overlay", hint: "Slides in after scrolling" },
  { id: "centre_modal", label: "Centre Modal", family: "overlay", hint: "Timed centre popup" },
  { id: "ribbon_badge", label: "Ribbon Badge", family: "overlay", hint: "Corner ribbon on tour cards" },
  { id: "sticky_footer_offer", label: "Sticky Footer Offer", family: "bar", hint: "Mobile offer strip" },
  { id: "hero_ribbon", label: "Hero Ribbon", family: "bar", hint: "Thin ribbon under the hero" },
];

export const PLACEMENT_LABELS: Record<PromoPlacement, string> = {
  top: "Top of page",
  bottom: "Bottom bar",
  home_hero: "Homepage — under the hero",
  home_tours: "Homepage — after the tours",
  tour_page: "Tour page — above booking",
  tour_card: "Tour cards — ribbon",
  overlay: "Floating / popup",
};

export const TARGET_LABELS: Record<PromoTarget, string> = {
  all: "Every page",
  home: "Homepage only",
  tours: "Tour pages only",
  tour: "One specific tour",
  checkout: "Checkout / booking pages",
};

export const EMPTY_PROMOTION: Omit<Promotion, "id" | "created_at" | "updated_at"> = {
  name: "New campaign",
  design: "classic_gold",
  placement: "top",
  target: "all",
  target_slug: null,
  headline: "Book direct and save 10%",
  subtext: "Private tuk-tuk tours with local drivers — free cancellation up to 24h.",
  code: null,
  cta_label: "See tours",
  cta_url: "/tours",
  image_url: null,
  badge_text: null,
  priority: 10,
  dismiss_rule: "session",
  dismiss_days: 7,
  starts_at: null,
  ends_at: null,
  enabled: false,
};

const SELECT = "*";

/** True when the campaign is on and inside its scheduled window. */
export function isPromotionLive(p: Promotion, now: Date = new Date()): boolean {
  if (!p.enabled) return false;
  if (p.starts_at && now < new Date(p.starts_at)) return false;
  if (p.ends_at && now > new Date(p.ends_at)) return false;
  return true;
}

export function promotionStatus(p: Promotion): "live" | "scheduled" | "ended" | "off" {
  if (!p.enabled) return "off";
  const now = new Date();
  if (p.starts_at && now < new Date(p.starts_at)) return "scheduled";
  if (p.ends_at && now > new Date(p.ends_at)) return "ended";
  return "live";
}

/** Does the campaign's page target match the current route? */
export function matchesTarget(p: Promotion, pathname: string, tourSlug?: string | null): boolean {
  switch (p.target) {
    case "home":
      return pathname === "/";
    case "tours":
      return pathname.startsWith("/tours");
    case "tour":
      return !!p.target_slug && !!tourSlug && p.target_slug === tourSlug;
    case "checkout":
      return pathname.startsWith("/booking") || pathname.startsWith("/book-a-tour");
    default:
      return true;
  }
}

const HIDDEN_PREFIXES = ["/admin", "/invoice", "/lovable", "/auth"];

export function pathAllowsPromotions(pathname: string) {
  return !HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
}

/* ---------------------------------- data --------------------------------- */

export const PUBLIC_PROMOTIONS_KEY = ["promotions", "live"] as const;

/** Public: all enabled campaigns (schedule is applied on the client). */
export function usePublicPromotions() {
  return useQuery({
    queryKey: PUBLIC_PROMOTIONS_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from("promotions" as never)
        .select(SELECT)
        .eq("enabled", true)
        .order("priority", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Promotion[];
    },
  });
}

export function useAdminPromotions() {
  return useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from("promotions" as never)
        .select(SELECT)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Promotion[];
    },
  });
}

export function useSavePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<Promotion> & { name: string }) => {
      const { id, created_at, updated_at, ...rest } = row as Promotion;
      const { error } = id
        ? await supabase.from("promotions" as never).update(rest as never).eq("id", id)
        : await supabase.from("promotions" as never).insert(rest as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: PUBLIC_PROMOTIONS_KEY });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: PUBLIC_PROMOTIONS_KEY });
    },
  });
}

export type PromoStats = Record<string, { impression: number; code_copy: number; cta_click: number }>;

export function usePromotionStats() {
  return useQuery({
    queryKey: ["admin-promotion-stats"],
    queryFn: async (): Promise<PromoStats> => {
      const { data, error } = await supabase
        .from("promotion_events" as never)
        .select("promotion_id, kind")
        .limit(20000);
      if (error) throw error;
      const out: PromoStats = {};
      for (const row of (data ?? []) as unknown as { promotion_id: string; kind: string }[]) {
        const bucket = (out[row.promotion_id] ??= { impression: 0, code_copy: 0, cta_click: 0 });
        if (row.kind in bucket) bucket[row.kind as keyof typeof bucket] += 1;
      }
      return out;
    },
  });
}

/* -------------------------------- tracking -------------------------------- */

const sentImpressions = new Set<string>();

export function recordPromoEvent(
  promo: Pick<Promotion, "id" | "name" | "code">,
  kind: "impression" | "code_copy" | "cta_click",
) {
  if (kind === "impression") {
    if (sentImpressions.has(promo.id)) return;
    sentImpressions.add(promo.id);
  }
  trackEvent(`promo_${kind}`, { promotion: promo.name, promotion_id: promo.id, code: promo.code ?? undefined });
  void supabase
    .from("promotion_events" as never)
    .insert({ promotion_id: promo.id, kind } as never)
    .then(() => undefined);
}

/* -------------------------------- dismissal ------------------------------- */

const DISMISS_PREFIX = "tt24_promo_";

export function isPromoDismissed(p: Promotion): boolean {
  if (typeof window === "undefined") return false;
  if (p.dismiss_rule === "never") return false;
  const key = `${DISMISS_PREFIX}${p.id}`;
  try {
    if (p.dismiss_rule === "session") return sessionStorage.getItem(key) === "1";
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    if (p.dismiss_rule === "forever") return true;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export function dismissPromo(p: Promotion) {
  const key = `${DISMISS_PREFIX}${p.id}`;
  try {
    if (p.dismiss_rule === "session") sessionStorage.setItem(key, "1");
    else if (p.dismiss_rule === "forever") localStorage.setItem(key, "1");
    else localStorage.setItem(key, String(Date.now() + Math.max(1, p.dismiss_days) * 86_400_000));
  } catch {
    /* private mode */
  }
}
