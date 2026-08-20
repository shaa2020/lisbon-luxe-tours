# Per-person pricing with a 2-guest minimum

Switch the whole site from "private group price (covers 2 guests, +€35 each extra)" to a clear per-person rate, with every tour requiring at least 2 guests.

## What customers will see

- Tour cards, tour pages, homepage, guide articles, pricing guide: "from €X per person" instead of a group price.
- Booking panel: guest stepper starts at 2 and cannot go below 2. Price line shows `€X per person × N guests`, then hotel pickup, promo discount, total, deposit.
- Custom tour builder: same per-person logic and 2-guest minimum, with a per-person line in the summary.
- Booking confirmation, change/upgrade flow and admin booking details show the same per-person breakdown.

## Pricing conversion

Current prices are group prices that already include 2 guests. When switching, each tour's stored price becomes a **per-person** rate. Default conversion: existing price ÷ 2 (rounded), so a €120 group tour becomes €60 per person and a 2-person booking still costs €120. The custom builder's duration/component prices convert the same way, and the separate "extra guest" surcharge is removed since every guest now pays the rate. All values remain editable in the admin panel afterwards.

## Admin panel

- Tour editor labels the price field "Price per person (€)" (plus sale price per person), with helper text noting minimum 2 guests.
- Custom builder component prices labelled per person; the "extra per guest" field is retired.
- Bookings list shows `guests × per-person rate` next to the total.

## Technical notes

- `tourPricing`/`n()` in `src/lib/cms.ts` gains a per-person + total-for-N helper; all callers (`tours.index`, `tours.$slug`, `index`, `TourCard`, `BookingModal`, `TourBookingPanel`, `GuideContent`, `tours.pricing-guide`, `lisbon-guide.$slug`) use it.
- `src/components/site/TourBookingPanel.tsx`: drop the `extras = (guests-2)*35` rule, subtotal = `rate × guests + pickup`, clamp stepper to 2–7.
- Server side must not trust the client: `src/lib/checkout.functions.ts`, `src/lib/custom-tour.functions.ts`, `src/lib/booking-changes.server.ts` recompute totals as `rate × guests` and validate `guests >= 2` (`z.number().min(2)`); remove `EXTRA_GUEST_CENTS`.
- `src/routes/api/public/bookings.ts` validates the same 2-guest minimum.
- Migration: halve `tours.price_from` / `tours.sale_price`, halve `custom_tour_components.price_cents`, drop the `extra_per_guest_cents` usage; existing bookings are untouched.
- Structured data (`offers` price, pricing-guide JSON-LD) updated to per-person with `priceSpecification` reflecting the unit.
