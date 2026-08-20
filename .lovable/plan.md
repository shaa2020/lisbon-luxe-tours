# Pricing strategy: per-person rates with group tiers

## The idea

One number is shown everywhere: the price **per person**, with "minimum 2 guests" next to it. Old prices stay visible as a crossed-out anchor where a tour is on sale. Bigger groups automatically pay a lower rate per person, so a 6-person booking is easier to sell and still worth more per tuk-tuk.

## Recommended per-person price list

Current stored prices were built around a whole tuk-tuk. These are the proposed new per-person rates (all editable in Admin, nothing is locked in):

| Tour | Old price | New price per person | 2 guests pay |
|---|---|---|---|
| Old Town Discovery – 1.5h | 40 | 25 | 50 |
| City Discovery – 2h | 70 (sale 60) | 39 (sale 35) | 70 |
| Belem Monuments – 3h | 100 | 55 | 110 |
| Cabo da Roca – 3.5h | 125 | 69 | 138 |
| Cascais Coastal Day – 6h | 225 | 119 | 238 |
| The Mists of Sintra – full day | 225 (sale 175) | 119 (sale 99) | 198 |
| Airport Luxury Transfer | 33 | stays 33 per transfer, not per person | 33 |

Rationale: a 2-guest booking lands close to the old headline price, so nothing looks like a price hike, while the advertised "from" number drops sharply and reads much better in Google results and ads against other Lisbon operators.

## Group discount tiers

Applied automatically on the per-person rate, shown live in the booking panel:

- 2 guests: full rate
- 3-4 guests: -5% per person
- 5-7 guests: -10% per person

Every tour keeps its 7-guest cap. Tier percentages are editable in Admin (Settings), and a tour can opt out of tiers.

## What changes on the site

- Tour cards, tour pages, homepage, guides, pricing guide: show only the per-person price plus "per person - min 2 guests"; the old price appears crossed out only when a sale is active.
- Booking panel and quick-book popup: headline is the per-person price. The breakdown below shows `rate per person x N guests`, the group discount line when a tier applies, hotel pickup (20 EUR) and the total.
- Airport transfer stays a flat per-transfer price with no guest multiplier and no 2-guest minimum.
- Booking confirmation email, admin booking detail and the public booking API return the same breakdown, so the numbers match everywhere.

## What changes in the admin panel

- Tour editor: "Price per person" and "Sale price per person", with a live helper showing what 2, 4 and 6 guests would pay.
- Settings: group discount tiers (thresholds and percentages), on/off switch.
- Custom tour builder: components stay per person, and the tiers apply to the custom total too.

## Technical notes

- Add `group_discount_tiers` (jsonb) and `group_discount_enabled` to `site_settings`; add `per_person_pricing` (boolean, default true) to `tours` so the airport transfer can be flat-rate.
- Central helper in `src/lib/pricing.ts` returning `{ perPerson, tierPct, guestsTotal, pickup, total }`, used by `TourBookingPanel`, `BookingModal`, `tours.custom.tsx`, `checkout.functions.ts`, `booking-changes.server.ts` and `api/public/bookings.ts` so client and server totals cannot diverge.
- Server recomputes the total from the tour row and tier config; client values are display only.
- New price values applied as a data update after you approve the table above.
