# Operations (Dispatch) module inside the existing admin panel

Bring the whole TukTuk Dispatch system into this project as a new **Operations** section of the current admin panel. It gets its own tables so nothing in the website (tours, bookings, orders, pricing, payments, guides) changes or breaks.

## What gets added

New section in the existing admin sidebar, with these screens:

```text
Admin
├── (existing: Dashboard, Tours, Bookings, Orders, Guide, Reviews, Settings ...)
└── Operations
    ├── Dispatch dashboard   KPIs: today's tours, guests, revenue, unassigned jobs
    ├── Day sheet (Today)    hour-by-hour run sheet with driver/vehicle assignment
    ├── Calendar             month view of all jobs
    ├── Jobs (bookings)      list + filters + full detail page + create/edit form
    ├── Customers            contact book with history
    ├── Tour catalogue       operational tours: duration, capacity, vehicle type
    ├── Vehicles             fleet, capacity, status, assigned driver
    ├── Guides & Drivers     staff, languages, availability status
    ├── Partners             hotels/agencies with commission %
    ├── Payments             payment records per job, balance due
    ├── Guest requests       change/cancel requests inbox
    └── Ops settings         currency, deposit %, default times, business info
```

Each job detail page carries: status pipeline (Inquiry → Pending → Confirmed → In Progress → Completed / Cancelled / No Show), payment status (Unpaid → Deposit Paid → Paid …), driver + guide + vehicle assignment, pricing breakdown (base, vehicle charges, extras, discount, total, deposit), special requests, internal notes, and an activity log of every change.

## How it connects to the website

- Website bookings (the existing `bookings` table used by checkout) are **mirrored into Operations** so every online booking shows up as a job you can assign and dispatch. Mirroring is one-way: editing a job never rewrites the customer's original booking or payment record.
- Existing customer-facing pages, prices, discounts and payment gateways are untouched.
- Operations jobs can also be created by hand for phone/WhatsApp/walk-in bookings, with a unique reference code.

## Access

Reuses the current admin login and admin role check. Everything sits behind the existing admin guard; no second login, no new auth system.

## Technical notes

- New tables, all prefixed to avoid clashing with the website's `tours` / `bookings` / `user_roles` / `site_settings`: `ops_customers`, `ops_tours`, `ops_staff`, `ops_vehicles`, `ops_partners`, `ops_bookings`, `ops_payments`, `ops_booking_activities`, `ops_change_requests`, `ops_settings`. RLS: admin-only via the existing `has_role` pattern, plus GRANTs; `service_role` for server functions.
- Routes added as `src/routes/admin.ops.*.tsx`, rendered inside the existing `AdminShell`, using the project's current styling and shadcn components (not the source project's sidebar layout).
- Data access through TanStack Query + the browser Supabase client, same as today's admin pages; a small `src/lib/ops/` folder holds types, query options and helpers.
- Mirroring website bookings → `ops_bookings` runs through a server function triggered on checkout success and a "Sync bookings" action in Operations, matched on booking id so re-runs don't duplicate.
- Not carried over from the source project: its auth/login pages, its public booking page, its MCP tool endpoints and its email templates — this project already has equivalents.
