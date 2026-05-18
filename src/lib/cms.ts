import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { tourImage, blogImage } from "./fallback-images";

export type Tour = {
  id: string;
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  duration: string;
  priceFrom: number;
  image: string;
  image_url: string | null;
  tagline: string;
  description: string;
  highlights: string[];
  itinerary: { time: string; title: string; detail: string }[];
  included: string[];
  notIncluded: string[];
  featured: boolean;
  published: boolean;
  sort_order: number;
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
    image_url: row.image_url,
    image: tourImage(row.slug, row.image_url),
    tagline: row.tagline ?? "",
    description: row.description,
    highlights: arr(row.highlights),
    itinerary: itineraryArr(row.itinerary),
    included: arr(row.included),
    notIncluded: arr(row.not_included),
    featured: row.featured,
    published: row.published,
    sort_order: row.sort_order,
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
    image: blogImage(row.slug, row.image_url),
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

export function useTours() {
  return useQuery({
    queryKey: ["tours", "public"],
    queryFn: async (): Promise<Tour[]> => {
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => mapTour(r as TourRow));
    },
  });
}

export function useTour(slug: string) {
  return useQuery({
    queryKey: ["tour", slug],
    queryFn: async (): Promise<Tour | null> => {
      const { data, error } = await supabase
        .from("tours")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? mapTour(data as TourRow) : null;
    },
  });
}

export function useBlogPosts() {
  return useQuery({
    queryKey: ["blog", "public"],
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => mapPost(r as BlogRow));
    },
  });
}

export function useBlogPost(slug: string) {
  return useQuery({
    queryKey: ["post", slug],
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
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
