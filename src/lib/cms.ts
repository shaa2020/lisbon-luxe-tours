import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { tourImage, blogImage } from "./fallback-images";
import { versionedUrl } from "./media";
import { mapTourOption, optionPrice, sortOptions, type TourOption, type TourOptionRow } from "./tour-options";
import {
  getPublishedBlogPostBySlug,
  getPublishedBlogPosts,
  getPublishedTourBySlug,
  getPublishedTours,
} from "./cms.functions";

export type Tour = {
  id?: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  duration: string;
  priceFrom: number;
  salePrice?: number | null;
  /** False for flat-rate services (airport transfer) priced per vehicle. */
  perPersonPricing?: boolean;
  image: string;
  image_url?: string | null;
  tagline: string;
  description: string;
  highlights: string[];
  itinerary: { time: string; title: string; detail: string }[];
  included: string[];
  notIncluded: string[];
  featured?: boolean;
  published?: boolean;
  sort_order?: number;
  /** Optional multi-duration options. Empty for legacy single-duration tours. */
  options?: TourOption[];
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  image_url: string | null;
  category: string;
  readTime: string;
  content: string[];
  comments: number;
  shares: number;
  date: string;
  published: boolean;
};

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];

const itineraryArr = (v: unknown): Tour["itinerary"] =>
  Array.isArray(v)
    ? v.map((x) => ({
        time: String((x as { time?: unknown })?.time ?? ""),
        title: String((x as { title?: unknown })?.title ?? ""),
        detail: String((x as { detail?: unknown })?.detail ?? ""),
      }))
    : [];

type TourRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  category_slug: string;
  duration: string;
  price_from: number;
  sale_price: number | null;
  image_url: string | null;
  tagline: string | null;
  description: string;
  highlights: unknown;
  itinerary: unknown;
  included: unknown;
  not_included: unknown;
  featured: boolean;
  published: boolean;
  sort_order: number;
  per_person_pricing?: boolean | null;
  tour_options?: TourOptionRow[] | null;
  updated_at?: string | null;
};

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  category: string;
  read_time: string;
  content: unknown;
  comments: number;
  shares: number;
  published_at: string;
  published: boolean;
  updated_at?: string | null;
};

export function mapTour(row: TourRow): Tour {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    categorySlug: row.category_slug,
    duration: row.duration,
    priceFrom: row.price_from,
    salePrice: row.sale_price,
    perPersonPricing: row.per_person_pricing !== false,
    image_url: row.image_url,
    image: versionedUrl(tourImage(row.slug, row.image_url), row.updated_at) ?? "",
    tagline: row.tagline ?? "",
    description: row.description,
    highlights: arr(row.highlights),
    itinerary: itineraryArr(row.itinerary),
    included: arr(row.included),
    notIncluded: arr(row.not_included),
    featured: row.featured,
    published: row.published,
    sort_order: row.sort_order,
    options: sortOptions((row.tour_options ?? []).map(mapTourOption)),
  };
}

export function mapPost(row: BlogRow): BlogPost {
  const d = new Date(row.published_at);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    image_url: row.image_url,
    image: versionedUrl(blogImage(row.slug, row.image_url), row.updated_at) ?? "",
    category: row.category,
    readTime: row.read_time,
    content: arr(row.content),
    comments: row.comments,
    shares: row.shares,
    date: isNaN(d.getTime())
      ? row.published_at
      : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`,
    published: row.published,
  };
}

export const TOURS_KEY = ["tours", "public"] as const;

/** SSR-friendly options so route loaders can warm the same cache entry. */
export const toursQueryOptions = {
  queryKey: TOURS_KEY,
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<Tour[]> => {
    const data = await getPublishedTours();
    return (data ?? []).map((r) => mapTour(r as TourRow));
  },
};

export function useTours() {
  const fetchTours = useServerFn(getPublishedTours);

  return useQuery({
    queryKey: TOURS_KEY,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Tour[]> => {
      const data = await fetchTours();
      return (data ?? []).map((r) => mapTour(r as TourRow));
    },
  });
}

export function useTour(slug: string) {
  const fetchTour = useServerFn(getPublishedTourBySlug);

  return useQuery({
    queryKey: ["tour", slug],
    queryFn: async (): Promise<Tour | null> => {
      const data = await fetchTour({ data: { slug } });
      return data ? mapTour(data as TourRow) : null;
    },
  });
}

export function useBlogPosts() {
  const fetchBlogPosts = useServerFn(getPublishedBlogPosts);

  return useQuery({
    queryKey: ["blog", "public"],
    queryFn: async (): Promise<BlogPost[]> => {
      const data = await fetchBlogPosts();
      return (data ?? []).map((r) => mapPost(r as BlogRow));
    },
  });
}

export function useBlogPost(slug: string) {
  const fetchBlogPost = useServerFn(getPublishedBlogPostBySlug);

  return useQuery({
    queryKey: ["post", slug],
    queryFn: async (): Promise<BlogPost | null> => {
      const data = await fetchBlogPost({ data: { slug } });
      return data ? mapPost(data as BlogRow) : null;
    },
  });
}

export const tourCategories = [
  { slug: "tuk-tuk", title: "Lisbon Tuk Tuk Tours" },
  { slug: "sintra", title: "Sintra Private Tours" },
  { slug: "belem", title: "Belém Tours" },
  { slug: "cascais", title: "Cascais Tours" },
  { slug: "sunset", title: "Sunset Tours" },
  { slug: "airport", title: "Airport Transfers" },
  { slug: "custom", title: "Custom Tours" },
];

export function tourPricing(tour: Pick<Tour, "priceFrom" | "salePrice"> & { options?: TourOption[] }) {
  // Multi-duration tours advertise the cheapest active option as their "from" price.
  const opts = (tour.options ?? []).filter((o) => o.isActive);
  if (opts.length > 0) {
    const cheapest = opts.reduce((a, b) => (optionPrice(b) < optionPrice(a) ? b : a));
    const original = cheapest.price;
    const sale = cheapest.salePrice;
    const current = sale ?? original;
    return {
      original,
      sale,
      current,
      onSale: sale !== null,
      discountPct: sale ? Math.round(((original - sale) / original) * 100) : 0,
    };
  }
  const original = tour.priceFrom;
  const sale =
    typeof tour.salePrice === "number" && tour.salePrice > 0 && tour.salePrice < original
      ? tour.salePrice
      : null;
  const current = sale ?? original;
  const discountPct = sale ? Math.round(((original - sale) / original) * 100) : 0;
  return { original, sale, current, onSale: sale !== null, discountPct };
}
