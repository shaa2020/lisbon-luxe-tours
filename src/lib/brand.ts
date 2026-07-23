import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSiteSettings } from "./cms.functions";
import defaultLogoAsset from "@/assets/tuktuk24-logo-new.png.asset.json";

export const DEFAULT_BRAND_NAME = "Tuk Tuk 24";
export const DEFAULT_BRAND_TAGLINE = "Lisbon Tours";
export const DEFAULT_BRAND_LOGO = defaultLogoAsset.url;

export const DEFAULT_BUSINESS = {
  contactEmail: "hello@tuktuk24.pt",
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

export type BusinessInfo = typeof DEFAULT_BUSINESS;
export type CustomTourHero = typeof DEFAULT_CUSTOM_TOUR;

export type SiteBrand = {
  brandName: string;
  logoUrl: string | null;
  business: BusinessInfo;
  customTour: CustomTourHero;
  hotelPickupFeeCents: number;
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
      return {
        brandName: (data as any)?.brand_name || DEFAULT_BRAND_NAME,
        logoUrl: (data as any)?.logo_url ?? DEFAULT_BRAND_LOGO,
        business: mapBusiness(data),
        customTour: mapCustomTour(data),
      };
    },
    placeholderData: {
      brandName: DEFAULT_BRAND_NAME,
      logoUrl: DEFAULT_BRAND_LOGO,
      business: DEFAULT_BUSINESS,
      customTour: DEFAULT_CUSTOM_TOUR,
    },
  });

  return {
    ...query,
    brandName: query.data?.brandName ?? DEFAULT_BRAND_NAME,
    logoUrl: query.data?.logoUrl ?? DEFAULT_BRAND_LOGO,
    business: query.data?.business ?? DEFAULT_BUSINESS,
    customTour: query.data?.customTour ?? DEFAULT_CUSTOM_TOUR,
  };
}
