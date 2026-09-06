# TukTuk24 — SEO audit and safe upgrade

I inspected the live site's code and ran the technical checks. Nothing below touches bookings, checkout, payments, tours, customers, the admin panel, logins or analytics. No existing web address changes.

## What the audit found

Already healthy (verified, not assumed):
- Home page loads for Google, gets fully rendered pages, robots file and sitemap are valid, site icon and share image are set.
- Every public page has its own title, description, share text and canonical address; tours, journal posts and destinations already have editable search fields in your admin.
- Admin, booking management, checkout, invoices and payment pages are correctly hidden from Google, and admin is blocked in the robots file.
- Guides and tours already carry breadcrumb and article/product markup; FAQ markup only appears where the questions are actually visible.

Real problems found:
1. **Invented business details in your site's data card**: a street address ("Largo da Graça 12, Lisboa") that you never gave me, and placeholder social links pointing at instagram.com / facebook.com. Google can penalise inconsistent business data.
2. **No trip/offer markup for the business as a tour provider** beyond the single product card per tour — no "TouristTrip" detail (duration, area, language) that Google uses for travel results.
3. **Breadcrumb markup missing** on journal articles and the tours listing.
4. **Pricing wording is inconsistent** in a few places (per person vs. per tuk-tuk) — the database is per person with a 2-guest minimum, but some copy and the price shown in tour markup don't say so.
5. **Home page title/H1** are close but not the phrasing tourists actually search; the description is under-length.
6. **Images**: no width/height on most photos, so the page can jump while loading; some alt text is generic.
7. **No location landing pages** for Alfama, Belém, Cascais and Cabo da Roca (only Lisbon and Sintra exist as standalone pages, plus the destinations section).
8. **No SEO overview screen** in the admin — you can edit fields per page, but can't see at a glance which pages are missing a title, description or image text.

## What I'll do

**Step 1 — Fix and harden (no new pages)**
- Remove the invented address and placeholder social links; keep only real details: TukTuk24, Lisbon Portugal, +351 922 024 690, tuktuklisbon24@gmail.com, tuktuk24lisbon.com. Add your real Instagram/Facebook links only if you send them.
- Add trip markup to tour pages using only real database values (duration, price, currency, meeting area), plus breadcrumbs on journal and tours listing.
- One clear pricing sentence everywhere: "€X per person · minimum 2 guests", matched in the tour markup.
- Home page title "Private Tuk Tuk Tours in Lisbon | TukTuk24", H1 "Private Tuk Tuk Tours in Lisbon", and a 150–160 character description. Design unchanged.
- Add width/height to photos so pages stop shifting, and improve the weakest alt text.

**Step 2 — Location pages with real content**
Build four pages using your genuine tours and destination content: Alfama, Belém, Cascais, Cabo da Roca (Lisbon and Sintra already exist). Each gets its own heading, intro, what you see, why a private tuk-tuk, practical info, FAQs, the matching tours and a booking button. Each keyword mapped to one page only, so tours don't compete with each other. Nothing thin or auto-filled — if there isn't enough genuine content for a page, I'll skip it rather than publish filler.

**Step 3 — SEO overview in the admin**
A new SEO page listing every public page with its title, description, main keyword, heading, image-text gaps and warnings (missing/duplicate title or description, no description, missing image text, thin content). Read-only checks — it never edits or deletes anything.

## Needs your decision

- **Three languages (English / Portuguese / Spanish)**: the site is currently English only — there are no Portuguese or Spanish pages at all. Doing this properly means translated addresses for every page and human-checked translations. It's a separate, larger project; I'd rather do steps 1–3 first and quote this after.
- **Blog writing tool**: already built at Admin → AI Writer (topic, keywords, length, tone → title, description, article, FAQs, link suggestions, saved as an unpublished draft). I'll add "Schedule" to it during step 3 if you want it.

## What I won't do

No fake reviews, ratings, awards, addresses or statistics. No mass thin pages. No URL changes, no redirects, no touching bookings, payments or analytics events.
