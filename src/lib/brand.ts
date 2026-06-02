import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSiteSettings } from "./cms.functions";
import defaultLogo from "@/assets/tuktuk24-logo.png";

export const DEFAULT_BRAND_NAME = "Tuk Tuk 24";
export const DEFAULT_BRAND_TAGLINE = "Lisbon Tours";
export const DEFAULT_BRAND_LOGO = defaultLogo as string;

export type SiteBrand = {
  brandName: string;
  logoUrl: string | null;
};

export function useSiteBrand() {
  const fetchBrand = useServerFn(getPublicSiteSettings);

  const query = useQuery({
    queryKey: ["site-brand"],
    staleTime: 60_000,
    queryFn: async (): Promise<SiteBrand> => {
      const data = await fetchBrand();
      return {
        brandName: data?.brand_name || DEFAULT_BRAND_NAME,
        logoUrl: data?.logo_url ?? null,
      };
    },
    initialData: {
      brandName: DEFAULT_BRAND_NAME,
      logoUrl: null,
    },
  });

  return {
    ...query,
    brandName: query.data?.brandName ?? DEFAULT_BRAND_NAME,
    logoUrl: query.data?.logoUrl ?? null,
  };
}
