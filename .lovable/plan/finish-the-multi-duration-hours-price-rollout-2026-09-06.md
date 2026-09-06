# Finish the multi-duration (hours + price) rollout

## Current state (verified)

- The multi-duration system is built and working on the **tour detail page**: duration picker, per-option price, highlights, itinerary, and the booking panel all react to the selected duration (`src/routes/tours.$slug.tsx`, `TourBookingPanel.tsx`, `DurationOptions.tsx`).
- The admin **Duration Options manager** exists in the tour editor (`TourOptionsManager.tsx`), and bookings store a snapshot of the chosen option.
- **Gap 1 — no tour has options yet.** The `tour_options` table is empty, so nothing shows on the site. Options must be added per tour in Admin → Tours → (tour) → Duration Options.
- **Gap 2 — the Quick Booking popup ignores durations.** `BookingModal.tsx` has no option picker; it always uses the tour's single legacy duration/price, so a tour with 2h/4h/6h options would still book at the old single price there.

## Changes

1. **Quick Booking popup** (`src/components/site/BookingModal.tsx`):
   - Show the same duration picker when the tour has active options (reuse `DurationOptions`, compact mode).
   - Price, per-person rate and total update from the selected option; the chosen option id is sent with the booking request (server already validates and snapshots it).
2. **Seed the options for your tours** (optional, only if you want me to): add sensible duration options (e.g. 2h / 4h / 6h with your prices) to each existing tour via the admin manager — or I can insert them directly once you tell me the durations and prices per tour.
3. **Consistency check**: tour cards and "From €X" labels keep showing the lowest option price (already the case via `tourPricing`); confirm the checkout, confirmation email and admin booking card show the chosen duration label.

## Technical notes

- No database changes needed — `tour_options` and the booking snapshot columns already exist.
- BookingModal gets `options` from the tour object (`useTours`/cms already loads them) and passes `tour_option_id` to `requestBooking`, which already accepts and validates it.
- Total math stays `optionPrice(selected) × guests` with group tiers, matching the tour page.
