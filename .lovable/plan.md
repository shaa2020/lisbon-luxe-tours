# Tuk Tuk 24 — Competitive improvement plan

Goal: close the gap between the current site and major online travel agencies (GetYourGuide, Viator, Tiqets) by improving conversion, trust, operational efficiency, and search reach — without losing the small-company authenticity that differentiates the brand.

## 1. Immediate fixes (do first)

### 1.1 Remove leftover Stripe references
`src/routes/admin.bookings.tsx` still imports and calls `getStripeSessionUrl` and other Stripe-only helpers from `booking-changes.functions.ts`. After the Mollie migration these will throw or return broken links. Replace with the Mollie-based modification payment flow or remove the Stripe path entirely so the admin "request extra payment" feature works.

### 1.2 Make the newsletter footer actually save emails
The footer email input is a non-submitting `<form>`. Add a real subscriber table + handler, or replace it with a mailto/WhatsApp CTA. A dead newsletter form looks unprofessional and wastes trust.

### 1.3 Fix footer link duplication
The footer has two "Journal" links and a "Shop" link that points to `/tours`. Clean up the labels so each link has one clear purpose.

### 1.4 Add missing legal pages
The footer links to Privacy, Terms, and Cookies as `#` placeholders. Major agencies all have real legal pages. Create `/privacy`, `/terms`, and a cookie-consent banner that records consent.

## 2. Conversion & booking experience

### 2.1 Make the homepage search bar actually search
The hero search bar has destination/date/guests/duration inputs but only links to `/tours` with no query params. Wire it so selections pre-filter the tours page (URL params: `?q=Alfama&date=...&guests=...`). This is the single highest-impact homepage change.

### 2.2 Add urgency and scarcity signals to tour cards
Major travel agencies use subtle scarcity to drive bookings:
- "X people booked this tour this week" (computed from confirmed bookings in the last 7 days).
- "Only Y spots left on [date]" based on remaining vehicle capacity for the selected date.
- "Free cancellation" badge on every card.

### 2.3 Show real-time availability on the tour page
The booking panel lets users pick a date/time but does not know if the slot is actually free. Add an `availability` table (or use booking rows) and block already-booked time slots. Display "Next available: [date]" when a date is sold out.

### 2.4 Add a "Reserve now, pay later" option
Not every traveler wants to pay immediately. Add a "Request booking" mode that creates a pending booking and sends a Mollie payment link via WhatsApp/email, with a 24-hour hold. This matches how high-end agencies handle private tours.

### 2.5 Improve the booking success page
After payment, the success page should show:
- A downloadable PDF voucher/confirmation.
- Add-to-calendar buttons (Google Calendar, Apple Calendar).
- A clear "What happens next" timeline: confirmation message → driver details 24h before → pickup.
- A one-click WhatsApp button with the booking reference pre-filled.

### 2.6 Add abandoned-booking recovery
If a user starts checkout but does not pay, store the booking as `status: 'abandoned'` and send a follow-up email/WhatsApp with a payment link after 1 hour and 24 hours. This requires collecting email/phone before payment begins.

## 3. Trust & social proof

### 3.1 Expand the review system
Currently reviews are shown only if they exist. To compete with agencies you need volume and verification:
- Automated post-tour review request email/WhatsApp 24h after the travel date.
- Review prompts from the admin panel (mark a booking as done → send request).
- Show "Verified by Tuk Tuk 24" badge on reviews tied to a real booking.
- Add a Reviews landing page (`/reviews`) with aggregate stats, distribution graph, and recent reviews across all tours.

### 3.2 Add a "Why book direct" section
Major OTAs charge 20-30% commission. Add a homepage/trust strip explaining the benefits of booking direct: lower price, free rescheduling, direct driver contact, local support.

### 3.3 Display licenses and insurance
The footer mentions RNAAT/NIF but hides them. Create a visible trust strip with:
- RNAAT registration number.
- NIF / VAT number.
- Licensed local drivers.
- Full insurance / liability coverage statement.
- Secure payment (Mollie) logos.

### 3.4 Add driver profiles
People buy from people. Add a `/drivers` or `/team` page with photos, names, languages spoken, and years of experience. Link driver names from tour pages where possible.

### 3.5 Add a live chat or chatbot
The WhatsApp FAB is good, but a proactive "Questions? Ask us on WhatsApp" bubble with suggested questions (e.g., "Can we customize this tour?") increases conversion.

## 4. SEO & content scale

### 4.1 Build destination and activity landing pages
Major agencies rank for hundreds of long-tail keywords. Create content routes for:
- `/lisbon/tuk-tuk-tours`
- `/lisbon/alfama-tour`
- `/sintra/day-trip-from-lisbon`
- `/belem/tuk-tuk-tour`
- `/cascais/coastal-tour`
- `/lisbon/sunset-tuk-tuk`
- `/lisbon/airport-transfer`
Each page should have unique copy, a map snippet, FAQs, and internal links to the relevant product pages.

### 4.2 Add structured data everywhere
Current structured data is good on `/tours` and tour detail pages. Expand it:
- `LocalBusiness` schema on the homepage with address, phone, opening hours, price range.
- `BreadcrumbList` on every route.
- `FAQPage` on `/faq` (already present — keep it).
- `Review` schema for individual reviews once volume justifies it.
- `Offer` schema with `priceValidUntil` for sale prices.

### 4.3 Create a blog content calendar
The journal exists but needs SEO-focused posts:
- "Best tuk-tuk tour in Lisbon: Alfama vs Belém"
- "How to get from Lisbon airport to the city center"
- "Sintra day trip itinerary from Lisbon"
- "Lisbon in 3 days: a local route"
Each post should link to relevant tours and include a booking CTA.

### 4.4 Optimize images and Core Web Vitals
Hero images are large and may slow mobile load. Add:
- Responsive `srcset` for hero and tour images.
- Preload the first hero slide.
- Lazy-load below-the-fold images (already partially done).
- Run an SEO scan after changes and fix any remaining findings.

## 5. Operations & admin efficiency

### 5.1 Build a real booking calendar
The admin dashboard shows an "upcoming this week" list. Replace/extend with a calendar view (`/admin/calendar`) showing bookings by date, color-coded by status, with drag-to-reschedule.

### 5.2 Add automated WhatsApp/email templates
From the admin booking detail, let the operator send pre-written messages:
- "Your booking is confirmed"
- "Driver details and pickup time"
- "Payment reminder"
- "Review request"
Store templates in `site_settings` and personalize with booking variables.

### 5.3 Add driver assignment and fleet management
Create tables for `drivers` and `vehicles`. Assign a driver/vehicle to each confirmed booking. Show capacity and avoid double-booking the same vehicle at the same time.

### 5.4 Add a customer CRM view
A `/admin/customers` page listing all customers with their booking history, total spent, and last contact. This lets you identify repeat guests and VIPs.

### 5.5 Add reporting beyond revenue
The dashboard shows revenue KPIs. Add:
- Conversion rate (bookings started vs completed payments).
- Most popular tours this month.
- Average booking value.
- Cancellation rate.
- Source breakdown (standard tour vs custom tour vs direct inquiry).

## 6. Mobile & performance

### 6.1 Fix mobile hero spacing
The homepage hero has a large fixed height (`h-[560px] sm:h-[640px] md:h-[760px]`). On small screens this pushes the search bar and content below the fold. Reduce mobile hero height and ensure the search bar is visible without scrolling.

### 6.2 Make the booking panel sticky on mobile
On mobile, the tour page shows a bottom "Check Availability" bar that opens a sheet. Make the sheet pre-filled with the selected date/time/guests from the page and add a "Book now" button inside the sheet, not just a link.

### 6.3 Add skeleton loading for all async sections
The tours grid has skeletons, but the homepage testimonials, blog, and brand data flash or jump. Add consistent skeleton states and reduce layout shift.

### 6.4 Improve tap targets and form accessibility
Some filter chips and time-slot buttons are small. Increase minimum tap target to 44px. Add `aria-label` to icon-only buttons and ensure color contrast meets WCAG AA.

## 7. Competitive differentiation

### 7.1 Launch a "Lisbon by locals" promise
Create a visible brand promise: all drivers are born in Lisbon or have lived there 10+ years, all tours are private, no commission-based stops. This is hard for big OTAs to copy.

### 7.2 Add a "Perfect for" section on tour pages
Help travelers choose: "Perfect for: first-time visitors, families with kids, photographers, cruise passengers, rainy days". This mirrors how major agencies categorize experiences.

### 7.3 Add a comparison table
On `/tours`, add a small comparison table showing Tuk Tuk 24 vs big OTAs: price, group size, customization, cancellation, local support. Keep it factual and avoid naming competitors.

### 7.4 Add gift cards / vouchers
A "Buy as a gift" option on each tour creates a new revenue stream and is common for experience platforms. Generate a printable PDF voucher with a unique code.

### 7.5 Add multi-language support
The nav shows "EN · PT · ES" but it is not clickable. Implement actual i18n for Portuguese and Spanish, starting with the most important pages (homepage, tours, booking panel). This opens up Iberian and Latin American traffic.

## 8. Implementation phases

### Phase 1 — Fix the foundation (week 1)
- Remove Stripe references and verify Mollie admin payments work.
- Fix footer links and newsletter form.
- Add Privacy/Terms/Cookie pages.
- Fix mobile hero spacing.

### Phase 2 — Conversion (weeks 2-3)
- Make homepage search functional.
- Add real-time availability blocking.
- Add "Reserve now, pay later" request flow.
- Improve success page with calendar/PDF/WhatsApp.

### Phase 3 — Trust & reviews (weeks 3-4)
- Automated review requests.
- Reviews landing page.
- Driver/team page.
- Trust strip with licenses and payment logos.

### Phase 4 — SEO & content (weeks 4-6)
- Build destination landing pages.
- Expand structured data.
- Publish 6-8 SEO blog posts.
- Image optimization and Core Web Vitals pass.

### Phase 5 — Operations (weeks 6-8)
- Admin calendar view.
- Driver/vehicle assignment.
- WhatsApp/email templates.
- Customer CRM and reporting.

### Phase 6 — Scale (weeks 8-10)
- Multi-language i18n.
- Gift vouchers.
- Abandoned booking recovery.
- Advanced analytics and A/B tests.

## 9. What to build next

If you want the biggest single win first, do these three in order:
1. **Functional homepage search** — turns the hero from decoration into a booking engine.
2. **Real-time availability** — removes the biggest conversion objection ("Will my date actually be free?").
3. **Automated review requests + reviews page** — builds the social proof volume that outranks smaller competitors.

After that, the destination landing pages and admin calendar will have the longest-lasting SEO and operational impact.
