export type DestinationSection = { heading: string; body: string };
export type DestinationFaq = { q: string; a: string };

export type Destination = {
  id: string;
  slug: string;
  name: string;
  heading: string | null;
  intro: string | null;
  bodySections: DestinationSection[];
  faqs: DestinationFaq[];
  relatedTourSlugs: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  seoTitle: string | null;
  metaDescription: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noindex: boolean;
  sortOrder: number;
  published: boolean;
  lastVerifiedAt: string | null;
  updatedAt: string | null;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

export function mapDestination(row: Record<string, unknown>): Destination {
  const sections = Array.isArray(row['body_sections']) ? (row['body_sections'] as unknown[]) : [];
  const faqs = Array.isArray(row['faqs']) ? (row['faqs'] as unknown[]) : [];
  return {
    id: String(row['id'] ?? ""),
    slug: String(row['slug'] ?? ""),
    name: String(row['name'] ?? ""),
    heading: (row['heading'] as string | null) ?? null,
    intro: (row['intro'] as string | null) ?? null,
    bodySections: sections.map((s) => ({
      heading: str((s as Record<string, unknown>)?.['heading']),
      body: str((s as Record<string, unknown>)?.['body']),
    })),
    faqs: faqs.map((f) => ({
      q: str((f as Record<string, unknown>)?.['q']),
      a: str((f as Record<string, unknown>)?.['a']),
    })),
    relatedTourSlugs: Array.isArray(row['related_tour_slugs'])
      ? (row['related_tour_slugs'] as string[])
      : [],
    imageUrl: (row['image_url'] as string | null) ?? null,
    imageAlt: (row['image_alt'] as string | null) ?? null,
    seoTitle: (row['seo_title'] as string | null) ?? null,
    metaDescription: (row['meta_description'] as string | null) ?? null,
    primaryKeyword: (row['primary_keyword'] as string | null) ?? null,
    secondaryKeywords: Array.isArray(row['secondary_keywords'])
      ? (row['secondary_keywords'] as string[])
      : [],
    canonicalUrl: (row['canonical_url'] as string | null) ?? null,
    ogImageUrl: (row['og_image_url'] as string | null) ?? null,
    noindex: row['noindex'] === true,
    sortOrder: Number(row['sort_order'] ?? 0),
    published: row['published'] === true,
    lastVerifiedAt: (row['last_verified_at'] as string | null) ?? null,
    updatedAt: (row['updated_at'] as string | null) ?? null,
  };
}
