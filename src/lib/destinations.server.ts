import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const DESTINATION_SELECT = `
  id, slug, name, heading, intro, body_sections, faqs, related_tour_slugs,
  image_url, image_alt, seo_title, meta_description, primary_keyword,
  secondary_keywords, canonical_url, og_image_url, noindex, sort_order,
  published, last_verified_at, created_at, updated_at
`;

export async function fetchPublishedDestinations() {
  const { data, error } = await supabaseAdmin
    .from("destinations")
    .select(DESTINATION_SELECT)
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchPublishedDestinationBySlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("destinations")
    .select(DESTINATION_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
