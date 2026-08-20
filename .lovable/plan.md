# Show one per-person price everywhere, with a "minimum 2 guests" note

The tour pages, cards and the main booking panel already show the per-person rate. The Quick Booking popup still carries the old group wording ("Includes base of 2 · €35 per additional guest"), which makes the price look like it covers 2 people. This cleans that up so every price on the site reads as one person, always paired with the group minimum note.

## Changes

- Quick Booking popup (the modal opened from cards / CTAs):
  - Replace the guest helper line with: "€X per person · minimum 2 guests · up to 7".
  - Add a price line above the total showing `€X per person × N guests`, so the total is clearly derived, not a group price.
  - Guest stepper stays clamped to 2–7 (already correct) and the total stays `rate × guests`.
- Consistency pass on the wording so every price label reads the same way: headline price = per person, subtitle = "per person · minimum 2 guests". Check the tour detail page ("From / person"), tour cards, homepage and tours list, and update any that don't match.
- No pricing math changes — totals are already `per-person rate × guests` on the client and recomputed server-side.

## Technical notes

- `src/components/site/BookingModal.tsx`: line 304 helper text, plus a per-person breakdown row in the total block.
- Label-only tweaks where needed in `src/routes/tours.$slug.tsx`, `src/components/site/TourCard.tsx`, `src/routes/tours.index.tsx`, `src/routes/index.tsx`.
