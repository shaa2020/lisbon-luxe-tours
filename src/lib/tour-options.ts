/**
 * Optional multi-duration support for tours.
 *
 * A tour can either stay exactly as it always was (one duration, one price —
 * the legacy `duration` / `price_from` / `sale_price` columns) or offer several
 * duration options stored in `public.tour_options`.
 *
 * Nothing here changes legacy behaviour: when a tour has no active options the
 * helpers below fall back to the tour's own fields.
 */

export type TourOptionBadge = "none" | "most_popular" | "best_value" | "recommended";

export type ItineraryStep = { time: string; title: string; detail: string };

export type TourOption = {
  id: string;
  durationMinutes: number;
  durationLabel: string;
  price: number;
  salePrice: number | null;
  shortDescription: string;
  badge: TourOptionBadge;
  isRecommended: boolean;
  isBestValue: boolean;
  sortOrder: number;
  isActive: boolean;
  highlights: string[];
  itinerary: ItineraryStep[];
  included: string[];
  notIncluded: string[];
};

export type TourOptionRow = {
  id: string;
  tour_id?: string;
  duration_minutes: number | string | null;
  duration_label: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  short_description: string | null;
  badge: string | null;
  is_recommended: boolean | null;
  is_best_value: boolean | null;
  sort_order: number | null;
  is_active: boolean | null;
  highlights?: unknown;
  itinerary?: unknown;
  included?: unknown;
  not_included?: unknown;
};

const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const itineraryArr = (v: unknown): ItineraryStep[] =>
  Array.isArray(v)
    ? v.map((x) => ({
        time: String((x as { time?: unknown })?.time ?? ""),
        title: String((x as { title?: unknown })?.title ?? ""),
        detail: String((x as { detail?: unknown })?.detail ?? ""),
      }))
    : [];

export function minutesToLabel(minutes: number): string {
  const h = minutes / 60;
  if (!Number.isFinite(h) || h <= 0) return `${minutes} min`;
  const rounded = Math.round(h * 10) / 10;
  return `${rounded} ${rounded === 1 ? "Hour" : "Hours"}`;
}

export function mapTourOption(row: TourOptionRow): TourOption {
  const minutes = Math.max(1, Math.round(Number(row.duration_minutes) || 60));
  const price = Math.max(0, Number(row.price) || 0);
  const saleRaw = row.sale_price == null ? null : Number(row.sale_price);
  const badge = (row.badge ?? "none") as TourOptionBadge;
  return {
    id: row.id,
    durationMinutes: minutes,
    durationLabel: (row.duration_label || "").trim() || minutesToLabel(minutes),
    price,
    salePrice: saleRaw != null && saleRaw > 0 && saleRaw < price ? saleRaw : null,
    shortDescription: row.short_description ?? "",
    badge: ["none", "most_popular", "best_value", "recommended"].includes(badge) ? badge : "none",
    isRecommended: row.is_recommended === true,
    isBestValue: row.is_best_value === true,
    sortOrder: Math.round(Number(row.sort_order) || 0),
    isActive: row.is_active !== false,
    highlights: strArr(row.highlights),
    itinerary: itineraryArr(row.itinerary),
    included: strArr(row.included),
    notIncluded: strArr(row.not_included),
  };
}

export function sortOptions(options: TourOption[]): TourOption[] {
  return [...options].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.durationMinutes - b.durationMinutes,
  );
}

/** Active, bookable options in display order. Empty for legacy tours. */
export function activeOptions(options: TourOption[] | undefined): TourOption[] {
  return sortOptions((options ?? []).filter((o) => o.isActive));
}

/** Label shown on the option card — explicit badge wins over the flags. */
export function optionBadgeLabel(o: TourOption): string | null {
  if (o.badge === "most_popular") return "Most Popular";
  if (o.badge === "best_value") return "Best Value";
  if (o.badge === "recommended") return "Recommended";
  if (o.isRecommended) return "Most Popular";
  if (o.isBestValue) return "Best Value";
  return null;
}

/** Price actually charged per person for an option. */
export function optionPrice(o: TourOption): number {
  return o.salePrice ?? o.price;
}

/**
 * Content shown for the selected option: option-specific content when present,
 * otherwise the main tour content.
 */
export function resolveContent<T>(optionValue: T[] | undefined, tourValue: T[]): T[] {
  return optionValue && optionValue.length > 0 ? optionValue : tourValue;
}
