# Admin Panel — Automation & "Make My Life Easy" Upgrades

A prioritized set of admin improvements focused on saving you time and automating repetitive work. Each item is independent — we can do all, or pick a subset.

## 1. Automation (the biggest time-savers)

- **Auto booking sync** — website bookings are mirrored into Operations automatically the moment payment/reservation happens (today you press "Sync bookings" by hand). One background step, no manual button.
- **Automatic email pipeline** — confirmation, reminder (24h before), and review-request emails send themselves via the existing email queue + cron. A toggle per email type already exists in settings; we'd wire the scheduler fully and show "next send" status in the dashboard.
- **Daily digest email to you** — every morning: today's tours, pending payments, new enquiries, open guest requests. One glance, zero clicking.
- **Abandoned-checkout nudge** — someone starts booking but never pays → automatic polite WhatsApp-style email after a few hours with a link to finish.
- **Smart assignment hints** — on the Ops day sheet, suggest driver/vehicle per job based on capacity and who's already assigned that day.

## 1b. Automatic lead generation

- **Every enquiry becomes a lead automatically** — contact form, WhatsApp clicks, booking-starts, exit-popup code copies, and custom-tour builds all create a row in the existing `leads` table with the source tagged. You never lose a potential customer.
- **Abandoned bookings → leads** — someone picks a date/tour but never pays → saved as a lead with tour + date details, then the auto-nudge email goes out.
- **Leads inbox in admin** — the existing `/admin/leads` page upgraded: status pipeline (New → Contacted → Quoted → Won/Lost), one-click "Convert to booking", and quick WhatsApp reply buttons.
- **Auto follow-up sequence** — lead with no reply after 24h gets a gentle follow-up email/WhatsApp template suggestion; you approve with one click.
- **Lead source report** — see which channels (Google, WhatsApp, exit popup, custom builder) actually bring customers, so you know where to spend.

## 2. Dashboard upgrades (see the business at a glance)

- **Revenue trends** — this week/month vs last, with a small chart and % change.
- **Conversion snapshot** — visits → enquiries → bookings using existing GTM events.
- **Action-needed strip at the top** — new bookings to confirm, unpaid balances, pending reviews, unanswered messages, open change requests — each with a one-click jump.
- **Booking pipeline** — move bookings Confirmed → Completed → Review requested with one click, firing the right email automatically at each step.

## 3. Quick booking + deposit payment link (requested)

- **Quick booking creator with deposit slider** — when you add a booking by hand (WhatsApp, phone, walk-in), choose how much to charge now: any amount from **20% to 100%** of the tour total (preset buttons 20/30/50/100% plus a custom field). It shows the exact euro amount and the remaining balance live.
- **Send the payment link straight to their email** — one click emails the customer a branded payment request with a secure "Pay €X now" button using the existing `/booking/pay/$id` page and PayPal Express. Optional WhatsApp copy-link button for the same URL.
- **Balance tracking** — after the deposit is paid, the booking shows "Deposit paid, €Y balance due" and you can send a balance request later with the same one click.
- Customer auto-complete from existing customer records so repeat guests are one keystroke.

## 4. Quality-of-life

- **Global search** (top bar) — find any booking, customer, or job by name, email, or reference instantly.
- **Bulk actions** — archive/confirm/email multiple bookings at once.
- **Export to CSV** — bookings, payments, customers for accounting.

## Suggested priority

1. Quick booking with 20–100% deposit + emailed payment link
2. Auto sync + automatic reminder/review emails + daily digest (pure automation)
3. Automatic lead capture + leads inbox pipeline
4. Action-needed strip + booking pipeline (fewer clicks every day)
5. Revenue trends + global search
6. Bulk actions, CSV export, smart assignment

## Technical notes

- Automation reuses the existing email queue, `email_send_log`, and the cron route pattern under `src/routes/api/public/cron/`.
- Auto sync extends `src/lib/ops-sync.functions.ts` so checkout success triggers it directly.
- All features respect the existing Owner/Manager/Staff permission system.
- No changes to customer-facing pages, pricing, or payments.
