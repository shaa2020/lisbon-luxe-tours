/**
 * Single source of truth for booking prices.
 *
 * Every tour is priced per person with a 2-guest minimum, except flat-rate
 * services (airport transfer) where the price covers the whole vehicle.
 * Larger groups get an automatic per-person discount from the tiers set in
 * Admin → Settings.
 */

export const MIN_GUESTS = 2;
export const MAX_GUESTS = 7;

export type GroupTier = { min_guests: number; percent: number };

export const DEFAULT_GROUP_TIERS: GroupTier[] = [
  { min_guests: 3, percent: 5 },
  { min_guests: 5, percent: 10 },
];

export function parseGroupTiers(raw: unknown): GroupTier[] {
  if (!Array.isArray(raw)) return DEFAULT_GROUP_TIERS;
  const tiers = raw
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      min_guests: Math.max(2, Math.round(Number((t as GroupTier).min_guests) || 0)),
      percent: Math.min(50, Math.max(0, Number((t as GroupTier).percent) || 0)),
    }))
    .filter((t) => t.min_guests >= 2 && t.percent > 0)
    .sort((a, b) => a.min_guests - b.min_guests);
  return tiers;
}

/** Highest tier percentage that applies to this party size. */
export function groupDiscountPct(
  guests: number,
  tiers: GroupTier[] = DEFAULT_GROUP_TIERS,
  enabled = true,
): number {
  if (!enabled) return 0;
  let pct = 0;
  for (const t of tiers) if (guests >= t.min_guests) pct = t.percent;
  return pct;
}

export type QuoteInput = {
  /** Per-person rate in euros (already sale-adjusted). */
  perPerson: number;
  guests: number;
  /** False for flat-rate services like the airport transfer. */
  perPersonPricing?: boolean;
  /** Hotel pickup fee in euros, only charged when requested. */
  pickupFee?: number;
  pickupRequested?: boolean;
  tiers?: GroupTier[];
  tiersEnabled?: boolean;
};

export type Quote = {
  guests: number;
  perPerson: number;
  /** Per-person rate after the group discount. */
  effectivePerPerson: number;
  tierPct: number;
  /** Guests × rate before the group discount. */
  guestsSubtotal: number;
  groupDiscount: number;
  pickup: number;
  total: number;
  perPersonPricing: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quote(input: QuoteInput): Quote {
  const perPersonPricing = input.perPersonPricing !== false;
  const guests = perPersonPricing
    ? Math.min(MAX_GUESTS, Math.max(MIN_GUESTS, Math.round(input.guests || MIN_GUESTS)))
    : Math.max(1, Math.round(input.guests || 1));
  const perPerson = Math.max(0, input.perPerson || 0);
  const tierPct = perPersonPricing
    ? groupDiscountPct(guests, input.tiers ?? DEFAULT_GROUP_TIERS, input.tiersEnabled !== false)
    : 0;

  const guestsSubtotal = perPersonPricing ? round2(perPerson * guests) : perPerson;
  const groupDiscount = round2((guestsSubtotal * tierPct) / 100);
  const pickup = input.pickupRequested ? Math.max(0, input.pickupFee || 0) : 0;
  const total = round2(guestsSubtotal - groupDiscount + pickup);

  return {
    guests,
    perPerson,
    effectivePerPerson: round2(perPerson * (1 - tierPct / 100)),
    tierPct,
    guestsSubtotal,
    groupDiscount,
    pickup,
    total,
    perPersonPricing,
  };
}

/** Short label used next to a headline price. */
export function priceUnitLabel(perPersonPricing = true): string {
  return perPersonPricing ? "per person · minimum 2 guests" : "per transfer";
}
