import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://tuktuk24lisbon.com";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly" | "yearly";
  priority?: string;
  lastmod?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { fetchPublishedTours, fetchPublishedBlogPosts } = await import("@/lib/cms.server");
        const { fetchPublishedGuideSlugs, fetchGuideCategories } = await import(
          "@/lib/travel-guide.server"
        );

        const { fetchPublishedDestinations } = await import("@/lib/destinations.server");

        const [tours, blogPosts, guides, guideCategories, destinations] = await Promise.all([
          fetchPublishedTours(),
          fetchPublishedBlogPosts(),
          fetchPublishedGuideSlugs(),
          fetchGuideCategories(),
          fetchPublishedDestinations(),
        ]);


        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/tours", changefreq: "weekly", priority: "0.9" },
          { path: "/destinations", changefreq: "weekly", priority: "0.8" },
          { path: "/book-a-tour", changefreq: "weekly", priority: "0.9" },
          { path: "/lisbon-private-tours", changefreq: "weekly", priority: "0.9" },
          { path: "/sintra-private-tours", changefreq: "weekly", priority: "0.9" },
          { path: "/build-your-own-tour", changefreq: "weekly", priority: "0.9" },
          { path: "/journal", changefreq: "weekly", priority: "0.8" },
          { path: "/lisbon-guide", changefreq: "weekly", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/tours/custom", changefreq: "monthly", priority: "0.8" },
          { path: "/tours/pricing-guide", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/reviews", changefreq: "weekly", priority: "0.8" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/cookies", changefreq: "yearly", priority: "0.3" },
          ...destinations.map((d) => ({
            path: `/destinations/${d.slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
            lastmod: formatDate(d.updated_at),
          })),
          ...tours
            .filter((t) => !(t as { noindex?: boolean | null }).noindex)
            .map((t) => ({
              path: `/tours/${t.slug}`,
              changefreq: "monthly" as const,
              priority: "0.8",
            })),
          ...guideCategories.map((c) => ({
            path: `/lisbon-guide/category/${c.slug}`,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),
          ...guides.map((g) => ({
            path: `/lisbon-guide/${g.slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
            lastmod: formatDate(g.content_updated_at ?? g.updated_at),
          })),
          ...blogPosts
            .filter((p) => !(p as { noindex?: boolean | null }).noindex)
            .map((p) => ({
            path: `/journal/${p.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
            lastmod: formatDate(p.published_at),
            })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});

function formatDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().split("T")[0];
}

