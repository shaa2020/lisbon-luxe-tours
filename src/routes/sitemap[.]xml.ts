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

        const [tours, blogPosts] = await Promise.all([
          fetchPublishedTours(),
          fetchPublishedBlogPosts(),
        ]);

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/tours", changefreq: "weekly", priority: "0.9" },
          { path: "/journal", changefreq: "weekly", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/faq", changefreq: "monthly", priority: "0.7" },
          { path: "/tours/custom", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.7" },
          { path: "/booking/success", changefreq: "yearly", priority: "0.3" },
          { path: "/booking/cancelled", changefreq: "yearly", priority: "0.3" },
          { path: "/admin", changefreq: "monthly", priority: "0.5" },
          { path: "/admin/login", changefreq: "yearly", priority: "0.5" },
          { path: "/admin/bookings", changefreq: "weekly", priority: "0.5" },
          { path: "/admin/messages", changefreq: "weekly", priority: "0.5" },
          { path: "/admin/orders", changefreq: "weekly", priority: "0.5" },
          { path: "/admin/reviews", changefreq: "weekly", priority: "0.5" },
          { path: "/admin/tours", changefreq: "weekly", priority: "0.5" },
          { path: "/admin/blog", changefreq: "weekly", priority: "0.5" },
          ...tours.map((t) => ({
            path: `/tours/${t.slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
          })),
          ...blogPosts.map((p) => ({
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

