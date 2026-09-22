/**
 * Shared (browser-safe) types and constants for the free-tier Web Intelligence
 * module. No Firecrawl calls and no secrets live here.
 */

export type SearchMode = "quick" | "standard" | "deep";

export const SEARCH_MODES: {
  value: SearchMode;
  label: string;
  leads: number;
  description: string;
}[] = [
  { value: "quick", label: "Quick search", leads: 10, description: "Fewest Firecrawl requests" },
  { value: "standard", label: "Standard search", leads: 25, description: "Moderate research" },
  { value: "deep", label: "Deep search", leads: 50, description: "Most detail — free-tier maximum" },
];

/** Free tier never allows more than 50 leads in one job. */
export const MAX_LEADS_PER_JOB = 50;
export const LEAD_COUNT_OPTIONS = [10, 25, 50] as const;

export const TARGET_MARKETS = [
  { value: "eu", label: "🇪🇺 EU" },
  { value: "uk", label: "🇬🇧 UK" },
  { value: "usa", label: "🇺🇸 USA" },
  { value: "canada", label: "🇨🇦 Canada" },
] as const;

export type TargetMarket = (typeof TARGET_MARKETS)[number]["value"];

export const LEAD_TYPES = [
  "Travel agencies",
  "Travel advisors",
  "Tour operators",
  "DMCs",
  "Portugal specialists",
  "Lisbon specialists",
  "Luxury travel agencies",
  "Group travel companies",
  "Hotels",
  "Boutique hotels",
  "Concierge companies",
  "Cruise excursion companies",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

/** Who we are looking for: travel businesses (B2B) or real travellers asking for a tour (B2C). */
export const LEAD_AUDIENCES = [
  {
    value: "partner",
    label: "🤝 Travel partners",
    description: "Agencies, tour operators, hotels and concierges who can send guests",
  },
  {
    value: "traveller",
    label: "🧳 Travellers asking for a tour",
    description: "Real people publicly asking for a Lisbon tour, guide or tuk tuk",
  },
] as const;

export type LeadAudience = (typeof LEAD_AUDIENCES)[number]["value"];

/** Public places where travellers ask for tour recommendations. */
export const TRAVELLER_SOURCES = [
  { value: "forums", label: "Travel forums", hint: "site:tripadvisor.com OR site:forum.tripadvisor.com" },
  { value: "reddit", label: "Reddit", hint: "site:reddit.com" },
  { value: "qa", label: "Question sites", hint: "site:quora.com OR site:lonelyplanet.com/thorntree" },
  { value: "blogs", label: "Travel blogs & comments", hint: "" },
] as const;

export type TravellerSource = (typeof TRAVELLER_SOURCES)[number]["value"];

/** What the traveller is asking for. */
export const TRAVELLER_INTENTS = [
  "Tuk tuk tour in Lisbon",
  "Private tour guide in Lisbon",
  "Lisbon city tour",
  "Sintra day trip",
  "Family tour with kids",
  "Group or party tour",
  "Cruise stopover tour",
  "Accessible / limited-mobility tour",
  "Food and wine tour",
  "Airport or hotel pickup tour",
] as const;

/** B2B partner pipeline, stored in the existing leads.status column. */
export const PARTNER_PIPELINE = [
  "new",
  "researched",
  "contacted",
  "interested",
  "quoted",
  "partner",
  "booking_generated",
  "not_relevant",
  "lost",
] as const;

export type PartnerStage = (typeof PARTNER_PIPELINE)[number];

export const STAGE_LABELS: Record<PartnerStage, string> = {
  new: "New",
  researched: "Researched",
  contacted: "Contacted",
  interested: "Interested",
  quoted: "Quoted",
  partner: "Partner",
  booking_generated: "Booking generated",
  not_relevant: "Not relevant",
  lost: "Lost",
};

export type UsageSnapshot = {
  monthlyLimit: number;
  creditsUsed: number;
  creditsRemaining: number;
  usagePercent: number;
  lowThresholdPercent: number;
  status: "safe" | "low" | "stopped";
  paidUsageEnabled: false;
  searches: number;
  pages: number;
  researchJobs: number;
  leadsFound: number;
  monthLabel: string;
};

/**
 * Conservative credit estimate: we always assume the most a job could cost,
 * so the hard stop can never be crossed by an under-estimate.
 * Firecrawl bills roughly one credit per search result and one per scraped page.
 */
export function estimateLeadJobCredits(leadCount: number, mode: SearchMode): number {
  const searchResults = Math.min(leadCount * 2, MAX_LEADS_PER_JOB * 2);
  const scrapes = mode === "quick" ? Math.ceil(leadCount / 2) : mode === "standard" ? leadCount : Math.ceil(leadCount * 1.5);
  return searchResults + scrapes;
}

export function estimateCompanyResearchCredits(): number {
  return 4;
}

export function estimateSeoResearchCredits(pages: number): number {
  return 10 + pages;
}

export function estimateContentResearchCredits(sources: number): number {
  return 10 + sources;
}

export function usageStatus(
  used: number,
  limit: number,
  lowThresholdPercent: number,
): UsageSnapshot["status"] {
  if (limit <= 0) return "stopped";
  if (used >= limit) return "stopped";
  if ((used / limit) * 100 >= lowThresholdPercent) return "low";
  return "safe";
}

export const STATUS_BADGE: Record<UsageSnapshot["status"], { label: string; dot: string; tone: string }> = {
  safe: { label: "SAFE", dot: "🟢", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  low: { label: "LOW REMAINING", dot: "🟡", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  stopped: { label: "STOPPED", dot: "🔴", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export const NOT_FOUND = "Not found";
