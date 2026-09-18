import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { applyTranslations, applyTranslationsSingle } from "./i18n/content.server";
import { DEFAULT_LOCALE, type Locale } from "./i18n/core";

export const DESTINATION_SELECT = `
  id, slug, name, heading, intro, body_sections, faqs, related_tour_slugs,
  image_url, image_alt, seo_title, meta_description, primary_keyword,
  secondary_keywords, canonical_url, og_image_url, noindex, sort_order,
  published, last_verified_at, created_at, updated_at
`;

export async function fetchPublishedDestinations(locale: Locale = DEFAULT_LOCALE) {
  const { data, error } = await supabaseAdmin
    .from("destinations")
    .select(DESTINATION_SELECT)
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return applyTranslations(data ?? [], "destinations", locale);
}

export async function fetchPublishedDestinationBySlug(slug: string, locale: Locale = DEFAULT_LOCALE) {
  const { data, error } = await supabaseAdmin
    .from("destinations")
    .select(DESTINATION_SELECT)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return applyTranslationsSingle(data, "destinations", locale);
}
