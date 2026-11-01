# Roadmap

## Independent Hostinger migration (2026-11-01)
- [x] Read-only full application, live schema, storage, integration and hosting audit.
- [ ] Migration strategy prepared; waiting for plan approval before runtime changes.
- [ ] Independent source/configuration preparation and deployment package after plan approval.
- [ ] Database/auth export and storage import handover; official production export required from owner.
- [ ] Isolated target validation, payment/email checks, authorized cutover and rollback rehearsal.

- [x] Let customers select any valid start time in both booking forms.

## Duration options + PT/ES site (approved plan 2026-09-18)
- [x] Duration options: verify end-to-end (admin save → public picker → booking snapshot)
- [x] Duration options: admin editor polish (tours-list badge, quick-add presets, toggles)
- [x] i18n foundation: locale routing (/pt, /es splat), LocaleContext, dictionary helper, switcher
- [x] i18n: migrate public pages to locale-aware page modules
- [x] i18n: one-time AI translation pass (static strings + DB content into content_translations)
- [x] i18n: SEO wiring (hreflang, localized canonicals, sitemap /pt /es)
- [x] QA: typecheck, Playwright smoke of /pt /es, duration booking flow, English unchanged

## Booking & admin upgrade (2026-09)
- [x] Audit existing system (bookings, payments, ops tables, pickup fee)
- [x] Migration 0001: meetup_points, tour_meetup_points, booking_payments, admin_audit_log, booking pickup/reference/tour_status columns
- [x] Admin Meetup Points page + nav entry
- [x] Customer two-option pickup (meetup included / hotel + fee) in BookingModal & TourBookingPanel
- [x] Pickup fee snapshot + idempotency key on checkout bookings
- [x] Booking list & details: show reference, pickup, guide/vehicle, statuses
- [x] Separate tour status vs payment status + Completed/Payment Due vs History rule
- [x] Payment ledger (booking_payments) + record payment (cash / paid to guide / bank) + Payment Due centre
- [x] Commission centre (owner only): editable rate, both-direction guide balances, settle-ups, CSV
- [x] Operations pages re-pointed at real bookings (day sheet, calendar)
- [x] Guides/vehicles assignment + conflict warnings
- [x] Audit/activity log page (/admin/audit-log)
- [ ] Reports, responsive pass, test scenarios
