import { supabaseAdmin } from "@/integrations/supabase/client.server";

const TOUR_SELECT = `
  id,
  slug,
  title,
  category,
  category_slug,
  duration,
  price_from,
  image_url,
  tagline,
  description,
  highlights,
  itinerary,
  included,
  not_included,
  featured,
  published,
  sort_order
`;

const BLOG_SELECT = `
  id,
  slug,
  title,
  excerpt,
  image_url,
  category,
  read_time,
  content,
  comments,
  shares,
  published_at,
  published
`;

export async function fetchPublishedTours() {
  const { data, error } = await supabaseAdmin
    .from("tours")
    .select(TOUR_SELECT)
    .eq("published", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedTourBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("tours")
    .select(TOUR_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchPublishedBlogPosts() {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select(BLOG_SELECT)
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedBlogPostBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("blog_posts")
    .select(BLOG_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function fetchSiteSettings() {
  const { data, error } = await supabaseAdmin
    .from("site_settings")
    .select("brand_name, logo_url")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
