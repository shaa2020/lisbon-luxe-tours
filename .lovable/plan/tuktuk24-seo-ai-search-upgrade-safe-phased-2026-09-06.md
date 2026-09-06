# TukTuk24 — SEO + AI Search Upgrade (safe, phased)

Nothing existing gets rebuilt or deleted: tours, bookings, customers, payments, admin, URLs and tracking stay exactly as they are. Every change below is additive.

## What I checked first (current state)

- Tours and journal posts have **no SEO fields at all** — no SEO title, meta description, keywords or canonical. Titles are auto-generated from the tour name.
- The **sitemap lists your admin pages** (/admin, /admin/bookings, /admin/orders…) — those should never be in it.
- **robots.txt allows everything**, including /admin, /booking and checkout pages.
- The Lisbon Guide section already has proper SEO fields, so it is the model to follow for the rest.
- There is **no destinations system** and **no keyword tracking**.

## Phase 1 — Fix what is actively hurting you (first)

- Remove all admin/checkout/thank-you pages from the sitemap; block them in robots.txt; keep the sitemap auto-updating on publish/unpublish.
- Add SEO fields to tours and journal posts (SEO title, meta description, primary + secondary keywords, canonical, social image, alt text) with editors in the admin, falling back to today's text when left empty so nothing changes until you fill it in.
- Homepage H1 and copy tuned to "Private Tuk Tuk Tours in Lisbon with Local Guides", without keyword stuffing.
- Correct canonical on every public page; one H1 per page; descriptive link and image alt text pass.
- Structured data from real data only: business info, tour offers with real prices in EUR, breadcrumbs, FAQ schema only where FAQs are visible, article schema on posts. No invented ratings or reviews.
- Open Graph and X cards per page using each tour's or post's own image.

## Phase 2 — Destination pages

New admin-managed landing pages (Lisbon, Alfama, Belém, Sintra, Cascais) with their own SEO fields, intro, content sections, images, FAQs, related tours and published toggle. Nothing auto-publishes.

## Phase 3 — SEO & Content section in the admin

New sidebar group: SEO Dashboard, Blog Posts, AI Blog Writer, Content Calendar, Keywords, Destination Pages, SEO Settings.

- **SEO Dashboard**: missing titles/descriptions, duplicate titles, pages without an H1, thin content, tours with no FAQs, broken internal links.
- **Keywords**: keyword, intent, priority, status, target page, plus a warning when two pages chase the same keyword. Never auto-deletes anything.
- **Content calendar**: Draft / Scheduled / Published / Needs Review, with day, week and month views.

## Phase 4 — AI Blog Writer (inside your admin)

- You give topic, primary and secondary keywords, intent, audience, length and tone; it returns SEO title, meta, slug, H1, intro, sections, FAQ, internal-link and image suggestions — all fully editable before anything goes live.
- It may only reference **published tours from your real database** and business facts you maintain in one place (policies, pickup, prices, contact). It cannot invent tours, prices or reviews.
- **Manual review is the default. Auto-publish is off** and needs explicit confirmation to turn on. Daily/monthly generation caps and usage history included.
- Uncertain facts are flagged for you to verify, with a place to record a source link and verification date.

## Phase 5 — AI search (AI Overviews, ChatGPT, Perplexity) & local SEO

- Clear question-and-answer structure, concise factual summaries, updated llms.txt, "last verified / last updated" stamps, comparison content (tuk tuk vs walking, private vs group), and consistent Lisbon local signals.
- No claims of guaranteed rankings or AI inclusion anywhere.

## Phase 6 — QA and report

Test booking, payment, admin login, sitemap, robots, canonicals, schema validation, and confirm analytics still fires exactly once. Then a written report: issues found, issues fixed, database changes, new admin features, and anything needing manual action from you.

## Technical notes

- Additive migrations only: new nullable SEO columns on `tours` and `blog_posts`; new tables `destinations`, `seo_keywords`, `content_calendar`, `ai_generation_log`, `business_knowledge`. Each with RLS + grants; public read only for published rows.
- AI generation runs server-side via `createServerFn` on the Lovable AI gateway — no keys in the browser.
- Sitemap/robots changes stay in `src/routes/sitemap[.]xml.ts` and `public/robots.txt`; metadata stays in each route's existing `head()`.
- No slug or URL changes; if a page is ever removed later, a 301 redirect is added instead.

## Suggested build order

Phase 1 now (biggest immediate win), then 2, 3, 4, and 5–6 last.
