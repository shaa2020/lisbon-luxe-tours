import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GUIDE_SELECT = `
  id, slug, title, category_id, excerpt, quick_answer, content,
  hero_image_url, hero_image_alt, hero_image_caption, author, reading_time,
  status, featured, featured_order, locale, published_at, content_updated_at,
  seo_title, meta_description, canonical_url, og_title, og_description, og_image,
  robots, created_at, updated_at
`;

export async function fetchGuideCategories() {
  const { data, error } = await supabaseAdmin
    .from("travel_categories")
    .select("id, slug, name, description, image_url, seo_title, meta_description, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedGuides() {
  const { data, error } = await supabaseAdmin
    .from("travel_guides")
    .select(GUIDE_SELECT)
    .eq("status", "published")
    .order("featured_order", { ascending: true })
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedGuideSlugs() {
  const { data, error } = await supabaseAdmin
    .from("travel_guides")
    .select("slug, updated_at, content_updated_at")
    .eq("status", "published");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchGuideBySlug(slug: string) {
  const { data: guide, error } = await supabaseAdmin
    .from("travel_guides")
    .select(GUIDE_SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!guide) {
    const { data: redirect } = await supabaseAdmin
      .from("travel_guide_redirects")
      .select("to_path, redirect_type")
      .eq("from_path", `/lisbon-guide/${slug}`)
      .maybeSingle();
    return { guide: null, redirect: redirect ?? null };
  }

  const [faqs, tags, related, tours, category] = await Promise.all([
    supabaseAdmin
      .from("travel_guide_faqs")
      .select("id, question, answer, sort_order")
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("travel_guide_tags")
      .select("tag_id, travel_tags(id, slug, name)")
      .eq("guide_id", guide.id),
    supabaseAdmin
      .from("travel_guide_related_articles")
      .select("sort_order, related_guide_id")
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("travel_guide_related_tours")
      .select("sort_order, tour_id")
      .eq("guide_id", guide.id)
      .order("sort_order", { ascending: true }),
    guide.category_id
      ? supabaseAdmin
          .from("travel_categories")
          .select("id, slug, name")
          .eq("id", guide.category_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const relatedIds = (related.data ?? []).map((r) => r.related_guide_id);
  const tourIds = (tours.data ?? []).map((r) => r.tour_id);

  const [relatedGuides, relatedTours] = await Promise.all([
    relatedIds.length
      ? supabaseAdmin
          .from("travel_guides")
          .select("id, slug, title, excerpt, hero_image_url, hero_image_alt, category_id, reading_time")
          .in("id", relatedIds)
          .eq("status", "published")
      : Promise.resolve({ data: [] }),
    tourIds.length
      ? supabaseAdmin
          .from("tours")
          .select(
            "id, slug, title, category, duration, price_from, sale_price, image_url, tagline, highlights, published",
          )
          .in("id", tourIds)
          .eq("published", true)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    guide,
    redirect: null,
    category: (category as { data: unknown }).data ?? null,
    faqs: faqs.data ?? [],
    tags: (tags.data ?? []).map((t) => t.travel_tags).filter(Boolean),
    relatedGuides: relatedGuides.data ?? [],
    relatedTours: relatedTours.data ?? [],
  };
}

export async function fetchGuideRedirects() {
  const { data, error } = await supabaseAdmin
    .from("travel_guide_redirects")
    .select("from_path, to_path, redirect_type");
  if (error) throw new Error(error.message);
  return data ?? [];
}
