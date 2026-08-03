# Booking modifications: extend duration or add guests after booking

## Goal
Let customers and admins change an existing booking (extend tour duration or add guests) and collect the extra amount through a new Stripe payment link tied to the original booking.

## What we'll build

### 1. Database schema
Add a `booking_modifications` table to keep an audit trail of every change:

```text
- id uuid primary key
- booking_id uuid references bookings(id)
- change_type text ('extend_duration' | 'add_guests' | 'admin_adjustment')
- old_value jsonb (e.g. { guests: 2, duration_hours: 2, amount_cents: 18000 })
- new_value jsonb (e.g. { guests: 3, duration_hours: 3, amount_cents: 24000 })
- difference_cents integer (amount the customer still owes; negative = refund due)
- stripe_session_id text (null until a payment link is created)
- payment_status text default 'pending' ('pending' | 'paid' | 'waived')
- status text default 'requested' ('requested' | 'approved' | 'applied' | 'rejected')
- notes text
- created_at / updated_at timestamps
```

GRANTs and RLS: authenticated admins can manage rows; customers can only read rows linked to their own email via a secure function.

### 2. Backend server functions
Extend `src/lib/checkout.functions.ts` with two new functions:

- `createModificationCheckout(data)`
  - Input: booking_id, change_type, new_guests?, new_duration?, reason?
  - Calculates the price difference using the same tour pricing rules as the booking panel.
  - Creates a new Stripe Checkout session for the difference only, with metadata pointing back to the original booking.
  - Inserts a `booking_modifications` row in `requested` / `pending` state.
  - Returns `{ url, modificationId }`.

- `confirmModificationPayment(data)`
  - Input: session_id
  - Verifies the Stripe session is `paid`.
  - Updates the modification row to `paid`/`applied`.
  - Updates the parent `bookings` row: guests, total_estimate, amount_total, notes.
  - Returns the updated booking summary.

### 3. Admin panel changes
In `src/routes/admin.bookings.tsx`:

- Add an "Edit booking" drawer/card per booking where admins can:
  - Change guest count
  - Change duration / tour
  - Add an internal note
  - Choose whether to charge the difference or waive it
- "Send payment link" button that calls `createModificationCheckout` and copies the Stripe URL, plus a pre-filled WhatsApp/email message.
- Show a modification history block under each booking.

### 4. Customer self-service
Create `src/routes/booking.manage.tsx`:

- Public page reachable via `/booking/manage?id=<bookingId>` or from a link in the confirmation message.
- Customer enters booking ID and email to fetch their booking.
- Shows current tour, date, guests, and total.
- Allows the customer to request:
  - Add guests (1–7)
  - Extend duration (if the tour has longer variants)
- On submit, creates a modification request and either:
  - Redirects to Stripe checkout if the difference is > 0, or
  - Shows a "request received" message if no extra charge applies.
- Also displays the cancellation policy and a "Contact us on WhatsApp" shortcut.

### 5. Communication helpers
Add helper functions in `src/lib/booking-changes.ts`:

- Pre-filled WhatsApp message for change requests.
- Pre-filled email subject/body for admins to send payment links.
- Update the success page and invoice PDF to reflect the latest booking totals after a modification is applied.

## Out of scope for this plan
- Refactoring the existing redirect-based Stripe checkout to embedded checkout.
- Automated email/SMS sending (we'll generate mailto/WhatsApp links, same pattern as the rest of the app).
- Refunds through Stripe; negative differences will be flagged for admin handling.

## Success criteria
- Admin can edit a booking and generate a Stripe payment link for the difference.
- Customer can open `/booking/manage` and request extra guests or hours.
- After paying the difference, the original booking reflects the new guest count/duration and total.
- All changes are logged in `booking_modifications` and visible in the admin panel.