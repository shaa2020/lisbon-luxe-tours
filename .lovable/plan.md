# Lisbon Travel Guide — CMS + SEO content hub

A new `/lisbon-guide` section powered by the database, managed entirely from the existing admin panel. Nothing in the current site (bookings, payments, tours, tour URLs, journal, analytics, auth) changes behaviour — the guide is added alongside it and reuses the same brand tokens, admin shell, auth, sitemap and GTM tracking.

## Scope in phases

### Phase 1 — Data + admin core (this build)
New tables: `travel_categories`, `travel_tags`, `travel_guides`, `travel_guide_tags`, `travel_guide_faqs`, `travel_guide_related_articles`, `travel_guide_related_tours`, `travel_guide_redirects`.

- Guides carry: title, slug, category, excerpt, rich content, hero image (+alt/caption), author, published/updated dates, reading time, status (draft / published / archived / trashed), featured + featured order, and full SEO block (seo title, meta description, canonical, OG title/description/image, robots), plus a `locale` column so other languages can be added later without a rebuild.
- Related tours store only the tour id — price, image, duration and URL are always read live from the existing `tours` table, so price changes propagate automatically and a deleted tour shows as "unavailable" in admin.
- Public read access limited to published rows; all writes admin-only, following the existing role checks. Slug changes automatically insert a 301 into the redirects table (with loop protection).
- Categories seeded with the six groups you listed (Plan Your Trip, Things to Do, Travelers, Day Trips, Transport & Practical, Travel Tips) — editable and deletable like any other row. No articles are auto-generated.

Admin section **Travel Guide** added to the existing sidebar with: Dashboard, Articles, Categories, Tags, Featured, Redirects.

- Article list: search, filters (category / status / featured / date), columns for article, category, status, featured, author, published, updated; row actions edit / preview / duplicate / publish / unpublish / archive / trash; bulk actions; confirmation on destructive actions; Trash view with restore and permanent delete.
- Article editor: all fields above, block-based rich editor (H2/H3, paragraph, bold, italic, lists, links, images with alt+caption, quotes, tables, buttons, CTA blocks, info boxes, local-tip blocks, tour cards, article cards, FAQ), repeatable FAQ rows with reordering, related-article and related-tour pickers, SEO panel with length indicators (advisory only), device preview (desktop / tablet / mobile), and autosave with Saving / Saved / Unsaved status.
- Images upload through the existing admin uploader (WebP conversion already in place), with required alt-text field.

### Phase 2 — Public pages (same build)
- `/lisbon-guide` — hero ("Your Local Guide to Lisbon"), featured guide, popular guides, one section per active category, recommended tours pulled from the live tours table, final CTA. Search and category filters driven by the database.
- `/lisbon-guide/$slug` — breadcrumbs, hero image, category label, single H1, intro, last-updated + reading time, Quick Answer, table of contents, article body, local tips, local recommendation + live tour card, FAQ accordion, related guides, related tours, final CTA. Mobile-first with a sticky CTA that does not overlap content.
- Category pages listing published articles.
- Nav gets an "Explore Lisbon" entry (dropdown on desktop, grouped links on mobile); homepage gets an "Explore Lisbon with TukTuk24" strip showing the admin-chosen featured guides.

### Phase 3 — SEO, structured data, analytics
- Existing `sitemap.xml` route extended with published guides and indexable categories (no second sitemap).
- Per-article head metadata, canonical, OG/Twitter, robots: published = index,follow; draft/archived/trashed = noindex,nofollow and not publicly listed.
- JSON-LD: Article, BreadcrumbList, FAQPage only when FAQs are visible, TouristTrip where genuinely applicable. No invented ratings, prices or stats.
- Redirect handling for changed slugs, managed from the Redirects admin page.
- Events pushed through the existing `analytics.ts` helper: `travel_guide_view`, `travel_article_view`, `travel_article_tour_click`, `travel_article_booking_click`, `travel_article_whatsapp_click`, `travel_guide_search`, `travel_guide_category_click`, `travel_guide_related_article_click`.

## Content
No articles are written or auto-generated. The categories are seeded so the section is usable immediately; every article is created by you in the admin panel.

## Technical notes
Server reads go through new `travel-guide.functions.ts` / `.server.ts` following the existing CMS pattern; admin writes use the browser client under the current admin role policies. Rich content is stored as structured blocks and rendered without `dangerouslySetInnerHTML`, so pasted HTML cannot inject scripts. All new tables get explicit grants plus RLS.
