/**
 * Images are sourced exclusively from the database (admin uploads).
 *
 * Bundled fallbacks used to render for a split second before the CMS data
 * arrived, which showed visitors outdated photos. There is intentionally no
 * fallback any more: components render a skeleton until the real image loads.
 */
export const tourImage = (_slug: string, image_url?: string | null) => image_url || "";

export const blogImage = (_slug: string, image_url?: string | null) => image_url || "";
