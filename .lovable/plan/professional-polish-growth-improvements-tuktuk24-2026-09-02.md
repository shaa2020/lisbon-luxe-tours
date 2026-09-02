# Professional Polish & Growth Improvements — TukTuk24

A curated set of upgrades to make the business look, feel, and operate like a premium company. Grouped by impact; each item is independent, so we can do all or pick a subset.

## 1. Trust & credibility (highest impact on bookings)

- **Live review count + rating badge in the hero** — real Google-style stars with review count next to the H1, pulled from the existing reviews table.
- **TripAdvisor / Google review badges** in the footer and on tour pages (link to the real listing via the existing `google_review_url` setting).
- **"As featured in" / license strip** — RNAAT license number, insurance note, and "Licensed tour operator" badge rendered as a clean trust row on the homepage and checkout.

## 2. Homepage & design polish

- **Fix the hydration mismatch** on the homepage (logo/hero image flashing between default and uploaded versions) — pre-render the configured brand settings instead of swapping after load.
- **Consistent section spacing & typography pass** — unify eyebrow styles, heading sizes, and container widths across homepage, tours, about, and journal so every page feels like one design system.
- **Micro-animations** — subtle reveal-on-scroll already exists; extend it to tour cards, reviews, and footer for a premium feel.
- **Professional 404 page** — branded "lost in Lisbon?" page with links back to tours.

## 3. Conversion improvements

- **Exit-intent / scroll popup** — one tasteful offer ("5% off your first booking" or WhatsApp prompt), dismissible, frequency-capped, editable from admin Marketing.
- **Booking urgency signals** — "Only 2 slots left this Saturday" style availability hints on tour pages using real availability data.
- **Abandoned-checkout follow-up** — if someone starts booking but doesn't pay, queue a polite WhatsApp/email nudge after a few hours (uses existing email queue).

## 4. Operations (admin panel)

- **Dashboard KPIs upgrade** — revenue this week/month vs last, conversion rate (visits → bookings from GTM events), top tours chart.
- **One-click booking status pipeline** — drag or click bookings through Confirmed → Completed → Review requested, with automatic emails at each step.
- **Daily digest email** — every morning, a summary of today's tours, pending payments, and new enquiries sent to owner/managers.

## 5. Professional finishing touches

- **Custom email templates final pass** — consistent logo header, brand colors, and footer with address/legal line on every transactional email.
- **Terms/Privacy/Imprint polish** — properly formatted legal pages with company details (important for EU/GDPR credibility).
- **Accessibility pass** — focus states, aria labels, contrast check so the site works for everyone (also helps SEO).

## Technical notes

- Review badges read from the existing `reviews` table and `google_review_url` site setting — no new tables.
- Availability hints reuse the existing availability functions.
- Abandoned-checkout uses the existing email queue + cron endpoint pattern.
- All new marketing elements (popup text, badges) editable via `site_settings` like the existing promo banner.

## Suggested priority

1. Hero trust badge + review counts (same day, biggest conversion lift)
2. Hydration fix + design consistency pass
3. Availability urgency signals
4. Dashboard KPIs + booking pipeline
5. Exit-intent popup + abandoned-checkout nudge
