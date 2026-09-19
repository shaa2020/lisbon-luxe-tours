# TukTuk24 — Booking & Operations Upgrade

## What the audit found

The site already has most of what the brief asks for, in two parallel systems:

- **Live bookings** (the real customer bookings, payments, refunds, deposits, promo codes, PayPal/Mollie, invoices, emails). This is the production data — 15 bookings, all payments reconciled.
- **An operations layer** (staff, vehicles, partners, jobs, customers, calendar, today view) that was built separately and is not linked to the real bookings.

So the upgrade is mostly: **connect the two, add meetup points, and finish the pickup flow** — not rebuild.

Key gaps found:
- Bookings store no pickup detail at all. Hotel pickup today is just a yes/no tick plus a line in the notes; the €20 fee is read live from settings, so a booking does not remember what was charged.
- There is no meetup point system anywhere.
- No booking reference on customer bookings (only long internal IDs).
- Tour status and payment status are mixed in places; nothing keeps a completed-but-unpaid booking out of history.
- The operations pages (calendar, today, customers, payments) read the separate ops data, so they look empty next to the real bookings.
- No audit trail of admin changes; no payment ledger for manually recorded payments.

## What will be built

### 1. Meetup points (new, admin-managed)
New table with name, address, map link, latitude, longitude, customer instructions, active flag, display order — plus an assignment table linking points to specific tours. New admin page under Operations: add, edit, reorder, activate/deactivate, delete when unused, assign to tours.

### 2. Two pickup choices in the booking form
Replaces the current tick box with exactly two options:
- **Meetup point — included**: shows only the active points assigned to that tour, with address and instructions.
- **Hotel pickup — +fee**: address search with autocomplete, saving name, full address, latitude, longitude and place ID.

The existing Hotel Pickup Fee setting stays the single source of truth. The fee charged is **copied onto the booking** at the moment of booking, so changing €20 to €25 later never alters an old booking.

### 3. Booking record extended (additive only)
New columns: pickup type, meetup point reference and snapshot (name/address/instructions), hotel name/address/lat/lng/place ID, pickup fee applied, and a short human booking reference (e.g. TT-2026-0042) backfilled for existing bookings. No existing column is changed or removed.

### 4. Status model
Tour status (Upcoming, Confirmed, In Progress, Completed, Cancelled, No Show) and payment status (Unpaid, Deposit Paid, Partially Paid, Fully Paid, Payment Due, Refunded, Partially Refunded) become independent, with outstanding balance always computed as total minus payments received. A completed booking with money owed stays in **Completed / Payment Due** and only moves to **History** once the balance is zero. Existing bookings are mapped to the new statuses without losing their current state.

### 5. Payment ledger + Payment Due centre
A payments table recording every collected amount (online captures are imported from the existing order records, so nothing is invented) plus manually recorded payments with method, reference and notes. Recording a payment updates paid, outstanding and payment status automatically. A Payment Due page lists everyone who owes money with View / Record payment / Send payment request.

### 6. Admin panel reorganised
Navigation regrouped into Dashboard, Bookings, Tours, Customers, Operations, Payments, Marketing, Reports, Settings — keeping every existing page, just re-homed. All existing admin pages stay reachable.

- **Dashboard**: today's tours, guests, revenue, payment due, then a chronological Today's Operations list with guide, vehicle, pickup, paid/due and quick actions.
- **Bookings**: table on desktop, cards on mobile, with search (reference, name, email, phone, tour) and filters (date ranges, tour, both statuses, guide, vehicle, source), paginated server-side.
- **Booking details**: single page with header, customer, tour, pickup (incl. map link), operations, financials, payment history and the action buttons listed in the brief.
- **Calendar**: rebuilt on the real bookings with month/week/day/agenda views, every entry clickable, agenda-first on mobile.
- **Guides & vehicles**: the existing staff and vehicle records, now assignable to real bookings with an overlap warning.
- **Customers**: grouped from real bookings by email/phone — bookings count, total spent, upcoming and past.
- **Reports**: revenue, bookings, guests, outstanding, tour performance, all date-filtered.

### 7. Safety
Duplicate-submission protection on checkout (idempotency key), an audit log of admin changes (who, when, what, before/after), and role checks enforced on the server for every new action, following the existing Owner/Manager/Staff roles.

## Technical notes

- All schema work is additive migrations with grants and row-level security; no drops, no renames, no data resets.
- New tables: `meetup_points`, `tour_meetup_points`, `booking_payments`, `admin_audit_log`. New nullable columns on `bookings`.
- Existing ops tables stay in place; operations pages are re-pointed at real bookings so both data sets remain intact.
- Pickup fee resolution stays in the existing settings + pricing code path; only the snapshot is new.
- Address autocomplete needs a Google Places key. Without one I will ship a free OpenStreetMap-based search (same saved fields: name, address, latitude, longitude, place ID) and it can be swapped to Google later by adding the key.

## Order of work

1. Meetup points (database + admin page)
2. Booking pickup fields + fee snapshot + booking reference
3. Customer two-option pickup in the booking form
4. Status model + lifecycle rules (Completed / Payment Due vs History)
5. Payment ledger, payment recording, Payment Due centre
6. Booking list + booking details page
7. Calendar, Today's Operations, guides, vehicles, customers
8. Reports, audit log, duplicate protection, roles
9. Responsive pass, then end-to-end testing of the scenarios in the brief against real data

## Open question

Do you have a Google Maps/Places API key for the hotel address search, or should I start with the free map search and switch later?
