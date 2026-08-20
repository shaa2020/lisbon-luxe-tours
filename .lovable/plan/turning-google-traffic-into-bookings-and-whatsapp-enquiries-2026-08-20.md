# Turning Google traffic into bookings and WhatsApp enquiries

Right now visitors land on a site with **no visible reviews** (0 approved reviews in the database), **no guide articles published**, and **no message received in the last 30 days** — while only 2 bookings came through in the same period. Traffic is arriving; nothing on the page is convincing people to act or giving them an easy way to talk to you.

The plan below is built around three levers you chose: real Google/TripAdvisor reviews, WhatsApp as the main contact channel, and a small direct-booking discount.

## 1. Trust — show that real people have taken this tour

- **Review importer in Admin → Reviews**: paste a Google or TripAdvisor review (name, rating, date, text, source, optional photo) and it publishes instantly. Source badge shown so it stays honest — nothing is invented.
- **Rating everywhere it matters**: star rating + review count in the header of tour pages, on tour cards, inside the booking panel, and in the homepage hero once at least 3 reviews exist. Hidden automatically while there are none.
- **Reviews wall** on the homepage and each tour page, with the newest reviews and a link to the full `/reviews` page.
- **Trust strip** under the hero: licensed local operator, free cancellation up to 24h, instant confirmation, no hidden fees, secure payment logos.
- **Guide/driver faces**: a short "Meet your driver" block on tour pages — a real photo and one line beats any slogan for conversion.

## 2. WhatsApp — make talking to you effortless

- **Smarter floating button**: expands into a small prompt after ~15 seconds or when the visitor moves to leave, with a message like "Questions about this tour? Message us — usually replies in a few minutes."
- **Context-aware messages**: the WhatsApp link pre-fills the tour name, date and guest count the visitor was looking at, so you receive a usable enquiry, not "hi".
- **WhatsApp button inside the booking panel** next to "Book now", plus one at the bottom of every tour and guide page.
- **Reply-time and language line** ("We reply in minutes · English, Portuguese, Spanish") — set from Admin → Settings.
- **Every WhatsApp click tracked** through the existing analytics helper, split by page and position, so we can see which placements actually work.

## 3. Booking friction — fewer reasons to leave

- **Discount code system** (new, admin-managed): create codes with a percentage or fixed amount, optional expiry, usage limit and minimum guests. Applied in the booking panel and honoured by the payment flow, visible on the confirmation page and in Admin → Bookings.
- **Welcome offer bar**: a dismissible top bar with your direct-booking code (e.g. "Book direct and save 10% — code DIRECT10"), on/off from Admin.
- **Exit-intent / scroll prompt** on tour pages: one polite card offering the code or a WhatsApp chat, shown once per visitor.
- **Booking panel clarity**: total price with no surprises, "free cancellation until <date>", "reserve now, pay later" made more visible, and a live scarcity line when few tuk-tuks remain that day.
- **Abandoned-booking recovery**: when someone enters name, email and WhatsApp number but doesn't pay, the details are saved as an incomplete booking in Admin → Bookings so you can follow up by WhatsApp, plus one automatic reminder email after an hour.

## 4. Follow-up — capture people who aren't ready today

- **Post-tour review request email** sent automatically a day after the travel date, linking to your Google review page and the on-site review form. This is what fills the reviews wall over time.
- **Lead magnet**: "Free 3-day Lisbon itinerary" email capture on the guide pages, feeding the existing subscribers table.
- **Admin dashboard block** showing enquiries, WhatsApp clicks, discount code usage and incomplete bookings for the last 30 days, so you can see whether these changes are working.

## 5. Content that pulls buyers, not just readers

Your traffic is arriving on pages with nothing to convert on. Every guide article and the Lisbon guide hub get a tour card, a WhatsApp prompt and the discount offer inserted mid-article and at the end — the highest-converting spot on travel content.

## Technical notes

- New tables: `discount_codes` (code, type, value, expiry, usage limit, min guests, active) and `discount_redemptions`; new columns on `reviews` for `source` and `source_url`; incomplete bookings reuse `bookings` with a `draft` status.
- Discount validation happens server-side in the existing checkout server functions so a code cannot be faked from the browser; the booking panel only previews the price.
- Review importer writes through the existing admin role policies; imported reviews are marked `approved` with their source recorded.
- Review-request and abandoned-booking emails use the email queue already set up on notify.tuktuk24lisbon.com.
- All new interactions push events through `src/lib/analytics.ts` (`whatsapp_click`, `discount_applied`, `offer_bar_click`, `exit_intent_shown`, `review_submitted`) so they appear in GA4 and Google Ads.
- Nothing changes in the existing payment, tour, or booking-modification logic; the discount is applied as a line item on the amount already calculated.

## Order of work

1. Reviews (importer + display everywhere) — biggest trust gap, fastest impact.
2. WhatsApp conversion layer.
3. Discount codes + offer bar + exit prompt.
4. Abandoned-booking capture and review-request emails.
5. Guide/article conversion blocks and the admin performance panel.
