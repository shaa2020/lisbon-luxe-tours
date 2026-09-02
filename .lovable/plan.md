# Admin Panel — Automation & "Make My Life Easy" Upgrades

A prioritized set of admin improvements focused on saving you time and automating repetitive work. Each item is independent — we can do all, or pick a subset.

## 1. Automation (the biggest time-savers)

- **Auto booking sync** — website bookings are mirrored into Operations automatically the moment payment/reservation happens (today you press "Sync bookings" by hand). One background step, no manual button.
- **Automatic email pipeline** — confirmation, reminder (24h before), and review-request emails send themselves via the existing email queue + cron. A toggle per email type already exists in settings; we'd wire the scheduler fully and show "next send" status in the dashboard.
- **Daily digest email to you** — every morning: today's tours, pending payments, new enquiries, open guest requests. One glance, zero clicking.
- **Abandoned-checkout nudge** — someone starts booking but never pays → automatic polite WhatsApp-style email after a few hours with a link to finish.
- **Smart assignment hints** — on the Ops day sheet, suggest driver/vehicle per job based on capacity and who's already assigned that day.

## 2. Dashboard upgrades (see the business at a glance)

- **Revenue trends** — this week/month vs last, with a small chart and % change.
- **Conversion snapshot** — visits → enquiries → bookings using existing GTM events.
- **Action-needed strip at the top** — new bookings to confirm, unpaid balances, pending reviews, unanswered messages, open change requests — each with a one-click jump.
- **Booking pipeline** — move bookings Confirmed → Completed → Review requested with one click, firing the right email automatically at each step.

## 3. Quality-of-life

- **Global search** (top bar) — find any booking, customer, or job by name, email, or reference instantly.
- **Keyboard-quick booking creator** — faster manual WhatsApp/phone booking entry with customer auto-complete from `ops_customers`.
- **Bulk actions** — archive/confirm/email multiple bookings at once.
- **Export to CSV** — bookings, payments, customers for accounting.

## Suggested priority

1. Auto sync + automatic reminder/review emails + daily digest (pure automation)
2. Action-needed strip + booking pipeline (fewer clicks every day)
3. Revenue trends + global search
4. Bulk actions, CSV export, smart assignment

## Technical notes

- Automation reuses the existing email queue, `email_send_log`, and the cron route pattern under `src/routes/api/public/cron/`.
- Auto sync extends `src/lib/ops-sync.functions.ts` so checkout success triggers it directly.
- All features respect the existing Owner/Manager/Staff permission system.
- No changes to customer-facing pages, pricing, or payments.
