# Fix and upgrade the Admin Orders section

## What I checked

- There are 8 payment records in the database, all marked paid, from PayPal and Mollie (June–September). Access rules and permissions allow Owner/Admin/Manager to read and edit them, so the data itself is reachable — the problems are in the Orders page behaviour, not the database.
- The Orders page today has real gaps:
  - It says "Card payments via Stripe", but every real payment came through PayPal or Mollie, and the payment provider is never shown on the card.
  - "Send invoice" does not actually send anything from your domain: it downloads a PDF and opens your local mail app with a blank attachment slot. Real domain email sending already exists elsewhere in the admin (used on the Bookings page) but is not wired into Orders.
  - The status dropdown always reads "Mark as paid/pending/..." and can be changed by accident with a single click, with no confirmation.
  - No search, no date filtering, no export, no refund recording, no link from an order to its booking, and no visibility of deposits vs. remaining balance (an order only stores the amount actually captured).

## What I will build

### 1. Correct, trustworthy order data
- Show the real payment provider (PayPal, Mollie, Manual) and the payment/session reference on each order.
- Show, for orders linked to a booking: booking reference, tour, travel date and time, guests, deposit paid vs. remaining balance, and booking status.
- Replace the Stripe wording with accurate copy.

### 2. Working actions
- Send invoice by email from your own domain using the existing email system (same one the Bookings page uses), with the invoice PDF link included and a record in the email log — no more local mail app.
- Download invoice PDF (kept).
- Request remaining balance: sends the customer the secure payment link for what is still due.
- Record a refund (full or partial) with a reason, writing it to the booking history and updating the order status.
- Open the linked booking in one click.
- Copy customer email / WhatsApp message shortcuts.
- Status changes move to an explicit menu with a confirmation, so nothing changes by accident.

### 3. Finding and reporting
- Search by customer name, email, tour, order or booking reference.
- Filters: status, provider, and date range (today, 7 days, 30 days, custom).
- Sort by date or amount.
- CSV export of the filtered list for accounting.
- KPI row upgraded: total revenue, revenue this month, average order value, refunded total, outstanding balances.

### 4. Presentation
- A compact table on desktop (scannable rows), cards on mobile, matching the rest of the admin panel styling.
- Pagination for when order volume grows.
- Proper empty and error states — if a load fails, it says why instead of showing "No orders here yet".

## Technical notes

- Rework `src/routes/admin.orders.tsx`; add a `src/lib/orders-admin.functions.ts` server module for invoice email, refund recording and balance requests, reusing `adminSendBookingEmail`, `adminRecordRefund` and `adminRequestPayment` in `src/lib/bookings-admin.functions.ts` plus the mailbox mapping in `src/lib/email/mailboxes.ts`.
- Refund and balance actions are guarded by the existing `orders.refund` / `orders.view` permissions, so Staff can view but not refund.
- No schema change is expected; refunds are stored on the linked booking's existing refund field and order status. If an order has no linked booking, refund recording is disabled with an explanation rather than failing silently.
