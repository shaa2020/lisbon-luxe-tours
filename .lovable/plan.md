# Guide App: installable, PIN-protected, cash and card, full toolkit

This builds on the run-sheet guides already have. Links, bookings and payments you already have keep working.

## 1. Install it like an app
- A separate "TukTuk24 Guide" app with its own icon and name. Guides install it from the browser with "Add to Home Screen" on iPhone or "Install app" on Android.
- It opens full screen, with no browser bar.
- An install button with simple step-by-step help for iPhone and Android.
- The last loaded tours stay visible with poor signal. A "No connection" notice shows, and buttons wait until the phone is back online.

## 2. Security: link plus a secret 4-digit PIN
- In Guides & drivers you set a 4-digit PIN for each guide. The PIN is stored scrambled, never as plain digits.
- Opening the app asks for the PIN. After that the phone stays unlocked for 12 hours. It locks again after 12 hours or when the guide taps "Lock".
- After 5 wrong PINs, that link is locked for 15 minutes and you get an alert.
- Guest phone numbers, the cash buttons and all actions work only after the PIN is entered.
- In admin you can reset a PIN, create a new link (the old one stops working), or pause a guide's access immediately.
- Every guide action (start, payment, finish) is saved to the booking history and the audit log, with the guide's name and time.

## 3. Taking payment: cash or card
When finishing a tour that still has money owed, the guide chooses:
- **Cash**: records the amount as guide cash, as it does today.
- **Card (on the guide's own card machine)**: records it as a guide card payment, with an optional last-4 digits or receipt number.
- **Send payment link**: opens WhatsApp with the guest's existing pay-balance link, so the guest can pay online on their own phone. The booking only shows as paid once the payment really arrives, as your payments work today.
- **Partial amount**: the guide can enter less than the full amount, and the rest stays owed.
- The amount owed is always worked out by the system. The guide cannot record more than is owed.

## 4. Everything else in the guide app
- **Tabs:** Today, Tomorrow, Next 7 days, History.
- **Tour card:** time, tour, guests, language, meeting point with Maps, call and WhatsApp buttons, and notes.
- **Tour steps:** "On my way" sends the guest a ready WhatsApp message and moves their My Tour page to "On the way". Then Start tour, Finish.
- **Quick guest messages:** Running late, I've arrived, Where are you?, Weather update.
- **Review request:** after a tour is finished, a one-tap WhatsApp message with your Google review link.
- **No-show:** marks the booking as a no-show. The guide must confirm first.
- **My earnings:** today's and this month's tours, cash and card collected, and the guide's commission, using the rates you already set.
- **Cash to hand in:** total cash the guide is holding that hasn't been settled with the office yet.
- **Office contact:** buttons to call or WhatsApp the office.

## 5. Admin side (Guides & drivers)
- A card for each guide: set or reset the PIN, copy or send the app link, pause access, and see when the guide was last active.
- Cash and card collected by guides appears in Reconciliation, as it already does, marked "via guide app".

## Technical details
- Changes to guides (added only, nothing removed or renamed): a scrambled PIN, PIN salt, pin_failed_count, pin_locked_until, access_paused and last_seen_at.
- The PIN check runs on the server with a timing-safe comparison. When it passes, the phone gets a signed 12-hour pass. Every guide action checks both the link and that pass. No sign-in account is needed.
- `public/guide.webmanifest` sets the app to open at /guide and uses its own icons. A small offline helper saves the last tour list; money buttons stay disabled while offline.
- Payment recording uses the existing guide_cash and guide_card methods and the existing settlement sync. "Send payment link" reuses the current pay-balance link and records no money until the provider confirms it.
- The "On my way" and "No-show" steps set the booking's tour status. The guest's My Tour page already follows it.
- Earnings are calculated from existing payment rows filtered by guide.
