# Duration Options (Admin-Managed) + Portuguese & Spanish Site

Two approved workstreams. Nothing existing is broken or replaced — upgrade-only.

## Part 1 — Duration options, managed from the admin panel

The multi-duration system is already built (database, admin editor, customer
picker). Today it is invisible because no tour has options yet. You will manage
everything yourself from the admin panel — no prices are invented for you.

What I will do:

1. **Verify the full flow end-to-end**: add options to a tour in Admin → Tours →
   Duration Options → save → confirm they appear on the public tour page with
   the right prices → book one → confirm the chosen duration and price flow into
   WhatsApp reservation, payment, confirmation email, and admin bookings.
2. **Polish the admin editor**: show a "Durations" count/badge per tour in the
   tours list, one-click quick-add for common durations (1h / 1.5h / 2h / 4h /
   6h / 8h) that pre-fills from the tour's current price so you only adjust the
   number, and clear publish/hide toggles.
3. **Public page polish**: the duration picker on tour pages and Quick Booking
   keeps the styling already approved; verify mobile layout and that
   "price from" reflects the cheapest option.

You add the real durations and prices for each tour yourself — I never invent
prices.

## Part 2 — Portuguese and Spanish versions of every public page

### How it works

- **URLs**: English stays at `/`. Portuguese lives under `/pt/...`, Spanish
  under `/es/...` (e.g. `/pt/tours/cabo-da-roca`, `/es/destinations`). This is
  the structure Google recommends; no existing URL changes.
- **Language switcher** in the navigation and footer (EN / PT / ES), keeping the
  visitor on the same page.
- **Static UI copy** (buttons, headings, forms, footer, booking panel, FAQs
  chrome) moves into a translation dictionary generated once with AI.
- **Database content** (tours, destinations, journal posts, travel guides,
  destination/location pages) gets translated into a new
  `content_translations` store, generated once with Lovable AI from the live
  English content. Reviews stay as guests wrote them.
- **SEO**: correct `hreflang` alternate links on every public page, localized
  page titles/descriptions/canonicals, and `/pt` + `/es` URLs added to the
  sitemap and submitted alongside the English ones.
- Admin panel, checkout/payment pages, and transactional emails stay in English
  for now (phase 2 later if wanted).

### Build steps

1. **Foundation**: locale-aware routing for `/pt` and `/es` reusing the existing
   page components (no duplicated route files), locale context, dictionary
   helper, switcher, and hreflang/canonical metadata.
2. **One-time AI translation pass**: batch-translate all static strings and all
   published DB content into PT and ES via Lovable AI (server-side), stored so
   pages render translated content during server rendering.
3. **SEO wiring**: sitemap, hreflang, localized metadata; re-verify robots.
4. **QA**: typecheck, smoke-test key `/pt` and `/es` pages (home, a tour, a
   destination, booking modal), confirm English pages unchanged, sitemap
   returns all three locales.

## Technical notes

- New table `content_translations` (table, record id, field, locale, value) with
  public read / staff write RLS and grants; additive only.
- Translation generation runs server-side through the Lovable AI gateway with
  batching and per-batch logging; failures retry per batch, never block English
  pages (missing translation falls back to English).
- `/pt` and `/es` are implemented as catch-all routes that dispatch to the
  existing English route components with a locale override, so a fix in one
  place applies to all three languages.
- Duration option changes touch only the existing `tour_options` flow; booking
  snapshots and pricing already support them.

## Out of scope

- Admin panel UI languages, translated customer emails, auto-detection redirects.
- Inventing duration prices — you enter those in the admin panel.
