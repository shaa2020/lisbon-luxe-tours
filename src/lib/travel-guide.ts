import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getGuideBySlug,
  getGuideCategories,
  getPublishedGuides,
} from "./travel-guide.functions";

/* ---------------- Content blocks ---------------- */

export type GuideBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; cite?: string }
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "tip"; title?: string; text: string }
  | { type: "info"; title?: string; text: string }
  | { type: "warning"; title?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "cta"; title: string; text?: string; label: string; href: string }
  | { type: "tour"; slug: string }
  | { type: "divider" };

export const BLOCK_LABELS: Record<GuideBlock["type"], string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  list: "List",
  quote: "Quote",
  image: "Image",
  tip: "Local tip",
  info: "Info box",
  warning: "Warning box",
  table: "Table",
  cta: "Call to action",
  tour: "Tour card",
  divider: "Divider",
};

export function emptyBlock(type: GuideBlock["type"]): GuideBlock {
  switch (type) {
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "list":
      return { type: "list", ordered: false, items: [""] };
    case "quote":
      return { type: "quote", text: "" };
    case "image":
      return { type: "image", url: "", alt: "" };
    case "tip":
      return { type: "tip", title: "Local tip", text: "" };
    case "info":
      return { type: "info", title: "Good to know", text: "" };
    case "warning":
      return { type: "warning", title: "Heads up", text: "" };
    case "table":
      return { type: "table", headers: ["", ""], rows: [["", ""]] };
    case "cta":
      return { type: "cta", title: "", text: "", label: "See tours", href: "/tours" };
    case "tour":
      return { type: "tour", slug: "" };
    case "divider":
      return { type: "divider" };
    default:
      return { type: "paragraph", text: "" };
  }
}

export function parseBlocks(value: unknown): GuideBlock[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (b): b is GuideBlock => !!b && typeof b === "object" && typeof (b as GuideBlock).type === "string",
  );
}

export function blocksToPlainText(blocks: GuideBlock[]): string {
  return blocks
    .map((b) => {
      if ("text" in b && typeof b.text === "string") return b.text;
      if (b.type === "list") return b.items.join(" ");
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadingTime(blocks: GuideBlock[]): number {
  const words = blocksToPlainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function guideHeadings(blocks: GuideBlock[]): { id: string; text: string; level: number }[] {
  return blocks
    .filter((b): b is Extract<GuideBlock, { type: "heading" }> => b.type === "heading")
    .filter((b) => b.text.trim().length > 0)
    .map((b) => ({ id: headingId(b.text), text: b.text, level: b.level }));
}

export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

/* ---------------- Row types ---------------- */

export type GuideCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  sort_order: number;
  active?: boolean;
};

export type GuideRow = {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  excerpt: string;
  quick_answer: string | null;
  content: unknown;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  hero_image_caption: string | null;
  author: string;
  reading_time: number;
  status: string;
  featured: boolean;
  featured_order: number;
  locale: string;
  published_at: string | null;
  content_updated_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  robots: string;
  created_at?: string;
  updated_at?: string;
};

export type GuideFaq = { id: string; question: string; answer: string; sort_order: number };

export const GUIDE_STATUSES = ["draft", "published", "archived", "trashed"] as const;

export function guideUrl(slug: string) {
  return `/lisbon-guide/${slug}`;
}

export function formatGuideDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/* ---------------- Public hooks ---------------- */

export function useGuideCategories() {
  const fn = useServerFn(getGuideCategories);
  return useQuery({
    queryKey: ["guide-categories", "public"],
    queryFn: async () => (await fn()) as GuideCategory[],
  });
}

export function usePublishedGuides() {
  const fn = useServerFn(getPublishedGuides);
  return useQuery({
    queryKey: ["guides", "public"],
    queryFn: async () => (await fn()) as GuideRow[],
  });
}

export function useGuide(slug: string) {
  const fn = useServerFn(getGuideBySlug);
  return useQuery({
    queryKey: ["guide", slug],
    queryFn: async () => fn({ data: { slug } }),
  });
}
