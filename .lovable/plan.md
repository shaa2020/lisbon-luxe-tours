# Homepage: turn visitors into instant bookings

What I found on the live homepage today:

- The hero has **no booking button** — the only action is a search bar with an empty destination field. A visitor who wants to book must scroll, guess, and hunt.
- **No price is visible anywhere above the fold**, and no rating, no "free cancellation", no "reserve now, pay later".
- **0 approved reviews in the database**, so the whole "Loved by travellers" section is hidden. The page currently shows zero social proof.
- Section order pushes selling far down: Hero → About us → Flash deals → Why ride with us → Popular tours → Destinations → Reviews → Gallery → Journal + newsletter. Tours appear only after two long non-selling blocks.
- One active discount code exists but it is not promoted on the homepage.
- 13 published tours, only 2 bookings in the last 30 days.

## What I want to change

### 1. Make the hero close the sale
- Add two buttons directly under the headline: **"Book a tour →"** (primary) and **"WhatsApp us"** (green), both tracked.
- Add a one-line trust bar under them: from €XX per person · free cancellation up to 24h · instant confirmation · licensed local drivers · your group only.
- Keep the slider and the search bar, but pre-fill the search with a sensible default so it never sits empty, and shorten it on mobile so the tours below start higher.

### 2. Put the tours right after the hero
New order:
Hero → **Popular tours** → trust/reviews strip → Why ride with us (short) → Destinations → How it works (3 steps) → About us (shortened) → Gallery → Journal + newsletter.
About us drops from a full section to a compact band; "Flash deals" merges into Popular tours as a highlighted first card so there is one tour grid, not two.

### 3. Cards that make people click "Book"
Each tour card on the homepage gets: price per person with "min 2 guests", duration, area, max group size, and a **Book now** button that opens the quick-booking popup directly (no extra page hop).

### 4. Fix the missing social proof (biggest gap)
- Add a compact "Import a Google / TripAdvisor review" flow reminder in the homepage reviews block only for admins, and until reviews exist, replace the hidden section with an honest **verified-operator strip** (licensed operator, electric fleet, X tours run, secure payment logos) instead of an empty gap.
- The moment reviews exist, the strip is replaced automatically by the real rating + newest reviews and the rating also appears in the hero.

### 5. Urgency and offer, honestly
- Show the active discount code in the offer bar and once inside the tours grid ("Book direct and save — code X"), dismissible.
- Show real availability pressure only when true (e.g. "2 tuk-tuks left for Saturday"), based on live booking data — never a fake countdown.

### 6. Mobile: a sticky booking bar
On mobile, a bottom bar appears after the hero: "From €XX pp — Book now" plus a WhatsApp icon. This alone is usually the single biggest lift on a phone-first travel site.

### 7. Remove / trim
- Remove the duplicate tour grid (Flash deals vs Popular tours).
- Trim the long About copy and the "Why ride with us" cards from full sections to short strips.
- Move the newsletter card below the journal so it stops competing with booking CTAs.

## Technical notes
- Work stays in `src/routes/index.tsx` (section order, hero CTAs, trust strip, card content), `src/components/site/TourCard.tsx`, plus a new `StickyBookBar` and `TrustStrip` component under `src/components/site/`.
- Prices, min-guest note and discount come from the existing `tourPricing` / `discounts` helpers — no pricing logic changes.
- Ratings read from the existing `reviews_public` view; everything rating-related stays hidden while the count is 0.
- All new CTAs push events through `src/lib/analytics.ts` so you can see in GA4 which one converts.
