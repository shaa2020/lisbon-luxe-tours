# Rebuild the Tours page so it feels real

The current /tours page looks generic: every card shows a hard-coded "★ 4.9", the copy is marketing filler ("The Collection", "private experiences across..."), and there is nothing on the page that proves a real Lisbon company runs these tours. The rebuild replaces invented signals with honest, concrete detail.

## What changes

**1. Honest ratings, no fake numbers**
- Remove the hard-coded 4.9 star badge from every card.
- Show a real rating only when that tour actually has approved reviews, as "4.8 (12 reviews)". Tours with no reviews yet show nothing instead of a fake score.

**2. A header that says something useful**
- Replace "The Collection / All Tours" with a plain, factual header: what the tours are, who drives them, where they start, and the real tour count.
- Add a small trust strip under the header: private groups only, hotel pick-up available (€20), free cancellation up to 24h before, licensed local drivers, electric tuk-tuks.

**3. Cards that answer the questions people actually ask**
Each card gains, in place of filler text:
- Duration, max group size, and the area it covers (Alfama, Sintra, Belém…)
- What's included at a glance (pick-up, water, guide) pulled from the existing tour data
- Language of the guide and "instant confirmation"
- Price shown as total for the private group, not a vague "from", with the sale price kept when one is set

**4. Real content sections below the grid**
- "How a tour actually runs" — a short 3-step timeline (we message you the day before, driver meets you at the door, route adapts on the day).
- "Good to know" — pick-up and drop-off, the €20 hotel pick-up fee, weather policy, luggage, accessibility, kids and child seats, payment methods.
- Cancellation policy in the same wording used everywhere else on the site.
- Real guest reviews carousel pulled from the review database (only if approved reviews exist).
- A short FAQ block reusing the existing site FAQ entries.

**5. Better empty and loading states**
- Loading skeletons match the new card shape.
- Empty search results suggest the closest categories instead of a bare "Nothing here yet".

**6. SEO**
- Rewritten title/description for the page and `ItemList` structured data listing the tours with real prices and, where available, real aggregate ratings — never invented ones.

## Not changing
- Booking flow, pricing logic, payment, and admin remain untouched.
- Tour content still comes from the database, so everything stays editable in Admin → Tours.

## Technical notes
- Work is confined to `src/routes/tours.index.tsx` (header, filter bar, card component, new sections) plus a small reviews-by-slug aggregate helper in `src/lib/reviews.ts` that fetches approved review counts/averages for all tours in one query.
- "Good to know" facts read the live hotel pick-up fee from `useSiteBrand()` and the shared policy text from `src/lib/cancellation.ts`, so they stay in sync with admin settings.
- FAQ entries reuse the existing FAQ data source used by `/faq`.
