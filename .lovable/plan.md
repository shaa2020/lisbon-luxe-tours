# Booking control centre + branded customer emails

## Goal
One place in the admin panel where you can handle any booking — whether it came from the website, WhatsApp, or a walk-in — and send professional emails to the customer from your own domain (tuktuk24lisbon.com, already verified for sending).

## 1. Add & manage bookings manually
In Admin → Bookings:

- **"New booking" button** — a form with customer name, email, WhatsApp number, tour (or free-text custom tour), date, time, guests, price, deposit/paid amount, source (WhatsApp / phone / walk-in / partner / website), and internal notes. Saves straight into the same booking list as website bookings.
- **Edit booking** — change any field on an existing booking (date, time, guests, tour, price, contact details, notes) with the change recorded in the booking's history.
- **Cancel / mark refunded / delete** — cancel with a reason, mark a refund (full or partial amount), or delete permanently with confirmation.
- **Duplicate booking** — for repeat customers.
- **Booking detail drawer** — full timeline: created, edited, emails sent, payments, modifications, refunds.

## 2. Emails sent from your domain
An "Email customer" menu on every booking. Each action opens a preview (subject + body, editable before sending), then sends from tuktuk24lisbon.com:

- **Booking confirmation** — tour, date, time, meeting point, guests, total, deposit/balance, booking reference, cancellation policy.
- **Payment request / balance due** — with the payment link (PayPal / Mollie / manual bank details).
- **Tour reminder** — driver name, phone, exact pickup point, what to bring.
- **Booking updated** — after a change of date, guests, or price.
- **Cancellation confirmation** — with refund terms applied.
- **Refund issued** — amount and expected arrival time.
- **Invoice email** — attaches the existing branded PDF invoice.
- **Review request** — sent after the tour, links to your Google review URL.
- **Free-form message** — blank branded template for anything else.

All emails use one branded layout (logo, gold/ink colours, footer with contact details and unsubscribe where legally needed) so they look consistent.

## 3. Reminders on autopilot (optional toggle)
A daily job that automatically sends the tour reminder 24h before departure and the review request 1 day after, for bookings that are confirmed and paid. Toggle on/off in Admin → Settings, with a per-booking opt-out.

## 4. Email history & templates
- **Admin → Emails** page: every email sent (recipient, type, booking, time, delivered/failed), with a resend button.
- **Templates tab**: edit the subject and body text of each email type, with placeholders like {{customer_name}}, {{tour}}, {{date}}, {{total}}, {{booking_ref}} — so you can adjust wording without code changes.

## Technical notes
- Emails go through the project's existing email queue (`enqueue_email` + the queue processor route) so sends are retried and logged in `email_send_log`; suppression and unsubscribe tables already exist and will be respected.
- New tables: `email_templates` (editable subject/body per type) and `booking_events` (audit timeline). Both get GRANTs plus admin-only RLS via the existing `has_role` function.
- Admin actions run through new `createServerFn` handlers in `src/lib/bookings-admin.functions.ts` and `src/lib/emails.functions.ts`, guarded by `requireSupabaseAuth` + admin role check.
- Email rendering: a shared branded HTML layout in `src/lib/email-templates.server.ts`; invoice PDF reuses `src/lib/invoice.ts` generated server-side and attached.
- Auto reminders: a `/api/public/cron/booking-emails` route protected by a secret header, triggered on a schedule.
- Manual bookings reuse the existing `bookings` table (adding a `source` column) so they appear in the current list, exports, ops sync, and stats with no separate flow.

## Out of scope
- Automated refunds through the payment provider (refunds are recorded and emailed; the money is moved in your PayPal/Mollie dashboard).
- SMS/WhatsApp automated sending (WhatsApp stays as pre-filled click-to-send links).
