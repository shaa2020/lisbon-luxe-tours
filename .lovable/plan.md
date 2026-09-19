# Cash payments and a commission centre for the owner

Two connected additions to the existing booking system. Nothing already in place is replaced.

## 1. New payment options on a booking

The payment status list on a booking gains two entries alongside the current ones:

- **Paid by cash** — the customer paid cash, and the company received it.
- **Paid to guide** — the customer paid the guide directly; the money never reached the company account.

When either is chosen, the booking asks for the amount and the date, and records it as a real payment in the existing payment ledger, so the booking's "paid" and "still owed" figures stay correct. Every cash or guide-paid entry is stamped with the guide assigned to that booking.

## 2. Commission centre (owner only)

A new page under Payments, visible only to the owner:

- **One commission rate** for the whole business, editable on the page. Changing it recalculates what is shown from that moment; past records keep the rate that applied when the money came in, so history never rewrites itself.
- **Money actually received** is the base: online payments confirmed by the provider, plus cash and paid-to-guide entries, minus refunds. Nothing is counted before it is real.
- **Summary tiles**: total collected, my commission, guide share, and the net balance.
- **Per guide breakdown** with both directions:
  - money the guide collected directly → the guide owes the company its commission,
  - money that came into the company account → the company owes the guide their share,
  - a single net balance per guide (who owes whom, and how much).
- **Per booking list** behind each guide: date, reference, customer, amount received, how it was paid, commission and guide share.
- **Filters** by date range and guide, plus a CSV export.
- **Settle up**: record a payout to a guide or a hand-over received from a guide, which clears the balance and stays in the history.

## Technical notes

- Migration (additive only): `commission_rate_percent` on `site_settings` (default 20); `guide_id`, `commission_rate_percent` and `commission_cents` on `booking_payments`; new `guide_settlements` table (guide, direction, amount, note, date, actor) with grants and owner-only RLS. No drops, renames or type changes.
- `booking_payments.method` gains the values `cash` and `guide` (free text today, no constraint to change). `direction` stays `payment` / `refund`.
- Server functions in a new `src/lib/commission.functions.ts`, all behind `requireSupabaseAuth` plus an owner-level role check: read the commission report, update the rate, record a settlement.
- `buildLedger` in `src/lib/booking-ledger.ts` already counts manual payment rows, so cash and paid-to-guide amounts flow into the existing booking sections (Payment due, History) with no change to that logic.
- Recording a payment writes a `booking_events` row and an `admin_audit_log` entry, matching how other admin money actions already behave.
- Nav entry gated by the existing `payments.manage` permission, which only the owner role holds.
