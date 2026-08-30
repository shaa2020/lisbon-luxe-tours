import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSiteSettings } from "./cms.functions";
import defaultLogoAsset from "@/assets/tuktuk24-logo-new.png.asset.json";
import { DEFAULT_GROUP_TIERS, parseGroupTiers, type GroupTier } from "./pricing";
import { versionedUrl } from "./media";

export const DEFAULT_BRAND_NAME = "Tuk Tuk 24";
export const DEFAULT_BRAND_TAGLINE = "Lisbon Tours";
export const DEFAULT_BRAND_LOGO = defaultLogoAsset.url;

export const DEFAULT_BUSINESS = {
  contactEmail: "tuktuklisbon24@gmail.com",
  contactPhone: "+351 922 024 690",
  whatsappPhone: "+351922024690",
  addressLine1: "Largo da Graça 12",
  addressLine2: "1100-265 Lisboa, Portugal",
  city: "Lisboa",
  country: "Portugal",
  instagramUrl: "https://instagram.com",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  footerTagline: "",
  footerLegal: "RNAAT 1042 · NIF 514 832 109",
};

export const DEFAULT_CUSTOM_TOUR = {
  eyebrow: "Build your own",
  title: "Design Your Private Lisbon Tour",
  subtitle:
    "Pick your vehicle, destinations, and extras. Live pricing — book now or request a quote.",
};

export const DEFAULT_HOTEL_PICKUP_FEE_CENTS = 2000;

export const DEFAULT_OFFER_BAR = {
  enabled: false,
  text: "Book direct and save",
  code: null as string | null,
};

export const DEFAULT_WHATSAPP_REPLY_LINE = "We usually reply within minutes";

export type OfferBar = typeof DEFAULT_OFFER_BAR;

export type PromoBannerTheme = "gold" | "ink" | "sunset";

export type PromoBanner = {
  enabled: boolean;
  headline: string;
  subtext: string | null;
  code: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  theme: PromoBannerTheme;
  startsAt: string | null;
  endsAt: string | null;
};

export const DEFAULT_PROMO_BANNER: PromoBanner = {
  enabled: false,
  headline: "Summer in Lisbon — 10% off private tuk tuk tours",
  subtext: null,
  code: null,
  ctaLabel: "See tours",
  ctaUrl: "/tours",
  theme: "gold",
  startsAt: null,
  endsAt: null,
};

function mapPromoBanner(d: any): PromoBanner {
  const theme = String(d?.promo_banner_theme || "gold");
  return {
    enabled: d?.promo_banner_enabled === true,
    headline: (d?.promo_banner_headline || "").trim() || DEFAULT_PROMO_BANNER.headline,
    subtext: (d?.promo_banner_subtext || "").trim() || null,
    code: (d?.promo_banner_code || "").trim() || null,
    ctaLabel: (d?.promo_banner_cta_label || "").trim() || null,
    ctaUrl: (d?.promo_banner_cta_url || "").trim() || null,
    theme: (["gold", "ink", "sunset"].includes(theme) ? theme : "gold") as PromoBannerTheme,
    startsAt: d?.promo_banner_starts_at ?? null,
    endsAt: d?.promo_banner_ends_at ?? null,
  };
}

/** True when the banner is on and inside its scheduled window. */
export function isPromoBannerLive(p: PromoBanner, now: Date = new Date()): boolean {
  if (!p.enabled) return false;
  if (p.startsAt && now < new Date(p.startsAt)) return false;
  if (p.endsAt && now > new Date(p.endsAt)) return false;
  return true;
}


function mapOfferBar(d: any): OfferBar {
  return {
    enabled: d?.offer_bar_enabled === true,
    text: d?.offer_bar_text || DEFAULT_OFFER_BAR.text,
    code: (d?.offer_bar_code || "").trim() || null,
  };
}

export type BusinessInfo = typeof DEFAULT_BUSINESS;
export type CustomTourHero = typeof DEFAULT_CUSTOM_TOUR;

export type HeroSlide = { label: string; image_url: string | null };

function mapHeroSlides(d: any, stamp?: string | number | null): HeroSlide[] {
  const raw = (d as any)?.hero_slides;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s: any) => s && typeof s === "object")
    .map((s: any) => ({
      label: String(s.label ?? "").trim(),
      image_url: versionedUrl(s.image_url ? String(s.image_url) : null, stamp),
    }))
    .filter((s: HeroSlide) => s.label || s.image_url);
}

export type SiteBrand = {
  brandName: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  aboutImageUrl: string | null;
  heroSlides: HeroSlide[];
  business: BusinessInfo;
  customTour: CustomTourHero;
  hotelPickupFeeCents: number;
  offerBar: OfferBar;
  promoBanner: PromoBanner;
  groupTiers: GroupTier[];
  groupDiscountEnabled: boolean;
  whatsappReplyLine: string;
  googleReviewUrl: string | null;
};

function mapBusiness(d: any): BusinessInfo {
  return {
    contactEmail: d?.contact_email || DEFAULT_BUSINESS.contactEmail,
    contactPhone: d?.contact_phone || DEFAULT_BUSINESS.contactPhone,
    whatsappPhone: d?.whatsapp_phone || DEFAULT_BUSINESS.whatsappPhone,
    addressLine1: d?.address_line1 || DEFAULT_BUSINESS.addressLine1,
    addressLine2: d?.address_line2 || DEFAULT_BUSINESS.addressLine2,
    city: d?.city || DEFAULT_BUSINESS.city,
    country: d?.country || DEFAULT_BUSINESS.country,
    instagramUrl: d?.instagram_url || DEFAULT_BUSINESS.instagramUrl,
    facebookUrl: d?.facebook_url || DEFAULT_BUSINESS.facebookUrl,
    twitterUrl: d?.twitter_url || DEFAULT_BUSINESS.twitterUrl,
    footerTagline: d?.footer_tagline || DEFAULT_BUSINESS.footerTagline,
    footerLegal: d?.footer_legal || DEFAULT_BUSINESS.footerLegal,
  };
}

function mapCustomTour(d: any): CustomTourHero {
  return {
    eyebrow: d?.custom_tour_eyebrow || DEFAULT_CUSTOM_TOUR.eyebrow,
    title: d?.custom_tour_title || DEFAULT_CUSTOM_TOUR.title,
    subtitle: d?.custom_tour_subtitle || DEFAULT_CUSTOM_TOUR.subtitle,
  };
}

export function useSiteBrand() {
  const fetchBrand = useServerFn(getPublicSiteSettings);

  const query = useQuery({
    queryKey: ["site-brand"],
    staleTime: 60_000,
    queryFn: async (): Promise<SiteBrand> => {
      const data = await fetchBrand();
      // Cache-bust admin-replaced images without disabling caching entirely.
      const stamp = (data as any)?.updated_at ?? null;
      return {
        brandName: (data as any)?.brand_name || DEFAULT_BRAND_NAME,
        logoUrl: versionedUrl((data as any)?.logo_url, stamp) ?? DEFAULT_BRAND_LOGO,
        heroImageUrl: versionedUrl((data as any)?.hero_image_url, stamp),
        aboutImageUrl: versionedUrl((data as any)?.about_image_url, stamp),
        heroSlides: mapHeroSlides(data, stamp),
        business: mapBusiness(data),
        customTour: mapCustomTour(data),
        hotelPickupFeeCents:
          Number((data as any)?.hotel_pickup_fee_cents ?? DEFAULT_HOTEL_PICKUP_FEE_CENTS) || 0,
        offerBar: mapOfferBar(data),
        promoBanner: mapPromoBanner(data),
        groupTiers: parseGroupTiers((data as any)?.group_discount_tiers),
        groupDiscountEnabled: (data as any)?.group_discount_enabled !== false,
        whatsappReplyLine:
          (data as any)?.whatsapp_reply_line || DEFAULT_WHATSAPP_REPLY_LINE,
        googleReviewUrl: (data as any)?.google_review_url || null,
      };
    },
    placeholderData: {
      brandName: DEFAULT_BRAND_NAME,
      logoUrl: DEFAULT_BRAND_LOGO,
      heroImageUrl: null,
      aboutImageUrl: null,
      heroSlides: [],
      business: DEFAULT_BUSINESS,
      customTour: DEFAULT_CUSTOM_TOUR,
      hotelPickupFeeCents: DEFAULT_HOTEL_PICKUP_FEE_CENTS,
      offerBar: DEFAULT_OFFER_BAR,
      promoBanner: DEFAULT_PROMO_BANNER,
      groupTiers: DEFAULT_GROUP_TIERS,
      groupDiscountEnabled: true,
      whatsappReplyLine: DEFAULT_WHATSAPP_REPLY_LINE,
      googleReviewUrl: null,
    },
  });

  return {
    ...query,
    brandName: query.data?.brandName ?? DEFAULT_BRAND_NAME,
    logoUrl: query.data?.logoUrl ?? DEFAULT_BRAND_LOGO,
    heroImageUrl: query.data?.heroImageUrl ?? null,
    aboutImageUrl: query.data?.aboutImageUrl ?? null,
    heroSlides: query.data?.heroSlides ?? [],
    business: query.data?.business ?? DEFAULT_BUSINESS,
    customTour: query.data?.customTour ?? DEFAULT_CUSTOM_TOUR,
    hotelPickupFeeCents: query.data?.hotelPickupFeeCents ?? DEFAULT_HOTEL_PICKUP_FEE_CENTS,
    offerBar: query.data?.offerBar ?? DEFAULT_OFFER_BAR,
    promoBanner: query.data?.promoBanner ?? DEFAULT_PROMO_BANNER,
    groupTiers: query.data?.groupTiers ?? DEFAULT_GROUP_TIERS,
    groupDiscountEnabled: query.data?.groupDiscountEnabled ?? true,
    whatsappReplyLine: query.data?.whatsappReplyLine ?? DEFAULT_WHATSAPP_REPLY_LINE,
    googleReviewUrl: query.data?.googleReviewUrl ?? null,
  };
}
