import alfama from "@/assets/tour-alfama.jpg";
import sintra from "@/assets/tour-sintra.jpg";
import caboroca from "@/assets/tour-caboroca.jpg";
import belem from "@/assets/dest-belem.jpg";
import cascais from "@/assets/dest-cascais.jpg";
import van from "@/assets/fleet-van.jpg";
import hero from "@/assets/hero-lisbon.jpg";

// Slug-keyed fallback images for content seeded from the original site,
// so the live pages keep their imagery before admins upload their own.
const tourFallbacks: Record<string, string> = {
  "alfama-heritage-tuk-tuk": alfama,
  "mists-of-sintra": sintra,
  "cabo-da-roca-sunset": caboroca,
  "belem-monuments-tuk-tuk": belem,
  "cascais-coast-private": cascais,
  "airport-luxury-transfer": van,
};

const blogFallbacks: Record<string, string> = {
  "lisbon-first-time-private-tour-guide": hero,
  "a-weekend-in-sintra-hidden-palaces-and-pine-forests": caboroca,
  "best-time-for-cabo-da-roca-sunset": sintra,
};

export const FALLBACK_TOUR_IMAGE = hero;
export const FALLBACK_BLOG_IMAGE = hero;

export const tourImage = (slug: string, image_url?: string | null) =>
  image_url || tourFallbacks[slug] || FALLBACK_TOUR_IMAGE;

export const blogImage = (slug: string, image_url?: string | null) =>
  image_url || blogFallbacks[slug] || FALLBACK_BLOG_IMAGE;
