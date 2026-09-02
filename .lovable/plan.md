# Promotions 2.0 — a real banner system

Today there is one promo banner with three colour themes plus a small offer strip, both edited as scattered fields in Settings → Marketing. Only one promotion can exist at a time and it can only appear in one place.

This replaces that with a proper promotions system: many campaigns, 20+ ready-made banner designs, and several ways to show them across the site.

## 1. Campaigns instead of one banner

A new Promotions section in the admin where you create as many campaigns as you like. Each campaign has:

- Headline, subtext, discount code, CTA label + link
- Optional image/badge (e.g. "-15%")
- Design (one of the 20+ below) and placement
- Schedule (start/end date-time) and priority
- Where it shows: all pages, homepage only, tours only, a single tour, or checkout
- Dismiss rule: never, once per session, or once every X days
- Live on/off toggle

If two campaigns match the same slot, the higher priority wins — never two stacked bars.

## 2. The design gallery (20+)

Chosen from a visual picker with a live preview of the real campaign text.

Top / bottom bars
1. Classic Gold — flat gold bar, bold headline
2. Ink Night — deep navy, gold code pill
3. Sunset Gradient — Lisbon sunset gradient
4. Marquee — slow scrolling ticker text
5. Ticket Stub — dashed edges, perforated code chip
6. Countdown Bar — live timer to the end date
7. Minimal Rule — hairline text-only, very quiet
8. Split Colour — two-tone bar with an arrow CTA
9. Tile Pattern — subtle azulejo pattern backdrop
10. Glass — blurred translucent bar over the hero

Inline section blocks (placed between homepage sections or on tour pages)
11. Feature Card — image left, text and CTA right
12. Coupon Card — big dashed code with copy button
13. Poster Strip — full-width photo with overlay text
14. Stat Ribbon — headline plus three small proof points
15. Duo Split — headline block next to a code block
16. Editorial — serif headline, thin rule, quiet CTA

Floating / overlay
17. Corner Pill — small bottom-left floating pill
18. Slide-in Card — slides in from the side after scrolling
19. Centre Modal — timed or exit-intent popup
20. Ribbon Badge — diagonal corner ribbon on tour cards
21. Sticky Footer Offer — mobile-only offer above the book bar
22. Hero Ribbon — thin ribbon pinned under the hero headline

All designs use existing brand tokens, are responsive, respect the current fixed-element stacking so nothing overlaps the sticky booking bar or WhatsApp button, and animate in gently.

## 3. Placements on the site

- Top of page (above nav)
- Bottom bar (coordinates with the existing sticky book bar)
- Homepage inline (after the hero or after the tours grid — you choose)
- Tour detail page (above the booking panel)
- Tour cards (ribbon badge)
- Overlay (modal / slide-in / corner pill)

## 4. Admin experience

New page Admin → Marketing → Promotions:
- Table of campaigns with status chips (Live / Scheduled / Ended / Off)
- Create/edit drawer with the design gallery, placement, schedule, targeting, dismissal
- Real preview rendered with the actual component, desktop and mobile toggle
- Duplicate a campaign, quick enable/disable
- Impressions, code copies and CTA clicks per campaign, so you can see what converts

The existing single banner and offer strip settings are migrated into the new system as two campaigns so nothing on the live site disappears.

## 5. Tracking

Every campaign fires `promo_impression`, `promo_code_copy` and `promo_cta_click` through the existing analytics layer with the campaign name, so it shows up in GA4 alongside booking events.

## Technical notes

- New `promotions` table (id, name, design, placement, target, headline, subtext, code, cta_label, cta_url, image_url, badge_text, priority, dismiss_rule, starts_at, ends_at, enabled, timestamps) with public read of live rows and admin-only writes, plus a small `promotion_events` counter table for impressions/clicks.
- New `src/components/promo/` folder: one registry mapping design id → component, plus a `PromoSlot` component that picks the highest-priority live campaign for a given placement.
- Live campaigns are loaded in the root loader alongside brand settings so they render server-side with no flash.
- Old `promo_banner_*` / `offer_bar_*` settings are copied into `promotions` by the migration; `PromoBanner.tsx` and `OfferBar.tsx` are replaced by the new slot system.
