# Guest "My Tour" page — one link with everything

Goal: when you confirm a tour, you send the guest one private link. On it they see their tour, their guide and where to meet, as simple steps that update as the tour gets closer.

## What the guest sees (mobile-first, clean)

A progress tracker at the top:

```text
 (1) Booked  ->  (2) Guide assigned  ->  (3) Tour day  ->  (4) On the way  ->  (5) Enjoy  ->  (6) Review
```

Below it, cards:
1. **Your tour**: tour name, photo, date, start time, length, number of guests, booking reference
2. **Your guide**: photo, first name, languages, short intro, "Call" and "WhatsApp" buttons (shown only once a guide is assigned; before that it says "Your guide will be confirmed 24h before")
3. **Where to meet**: meeting point or hotel pickup, instructions, "Open in Google Maps" button
4. **Payment**: amount paid, balance still due, "Pay balance" button if something is owed
5. **Before you go**: what to bring, cancellation policy, add to calendar
6. **Need help?**: WhatsApp the office
7. After the tour: thank-you message and a link to leave a genuine review

The current step moves forward on its own from the booking's status and tour stage you already set in admin (e.g. marking "Guide on the way" moves the guest to step 4). The page refreshes itself every minute on tour day.

## How you share it
- New "Guest tour page" item in the booking's WhatsApp and Email menus: sends the link with a short message
- "Copy guest link" in the More menu
- The link is also added automatically to the confirmation email and the day-before reminder

## Privacy and safety
- Each booking gets a long, unguessable private link; only people with the link can open it
- Shows only that guest's own booking; no other guests' details, no internal notes, no commission info
- You can "Reset link" if it was shared by mistake (the old link stops working)
- Cancelled bookings show a clear "This booking was cancelled" message
- Hidden from Google

## Worth knowing
- Guide photo, languages and short intro are new optional fields on each guide in the Team page; if empty, just the name and phone show
- Nothing existing changes; old bookings get a link automatically

## Technical notes
- Migration (additive): `bookings.guest_token text unique default encode(gen_random_bytes(24),'hex')` with backfill; `ops_staff` add nullable `photo_url`, `languages text[]`, `bio text`.
- Public server fn `getGuestTour({token})` using the admin client inside the handler, strict safe-field projection (tour, date/time, guests, reference, meetup fields, guide name/phone/photo/languages/bio, paid/balance, status, stage). No broad anon RLS.
- Admin fn `resetGuestToken` (manager+), logged to audit log.
- New public route `src/routes/trip.$token.tsx`, `noindex`, own head(), error/notFound components, 60s refetch on tour day.
- Stage-to-step mapping helper; links wired into BookingActions menus, booking-notice emails and the reminder cron; guide fields added to Team editor.
