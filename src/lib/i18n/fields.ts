import type { Locale } from "./core";

/**
 * Which DB fields are translatable, per table.
 * text = plain string fields. json = fields stored as JSON (arrays or objects);
 * translated values are stored in content_translations as JSON strings.
 */
export const TRANSLATABLE: Record<
  string,
  { text: string[]; json: string[] }
> = {
  tours: {
    text: ["title", "tagline", "description", "seo_title", "meta_description"],
    json: ["highlights", "included", "not_included", "itinerary"],
  },
  blog_posts: {
    text: ["title", "excerpt", "seo_title", "meta_description"],
    json: ["content"],
  },
  destinations: {
    text: ["name", "heading", "intro", "seo_title", "meta_description"],
    json: ["body_sections", "faqs"],
  },
  faqs: {
    text: ["question", "answer"],
    json: [],
  },
  travel_guides: {
    text: ["title", "excerpt", "quick_answer", "seo_title", "meta_description"],
    json: ["content"],
  },
  travel_categories: {
    text: ["name", "description", "seo_title", "meta_description"],
    json: [],
  },
};

export type OverlayMap = Map<string, Map<string, string>>;
