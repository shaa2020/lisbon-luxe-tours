# Admin panel redesign + switchable payments (Mollie / Stripe)

Two things: rebuild the admin into a proper, organised back-office, and add a Payments settings area where you choose which provider takes the money.

## 1. Admin redesign

Today the admin is a flat row of tabs, and every site setting (brand, contact, homepage images, hero slides, pickup fee, capacity, payments toggle) is crammed into one long form on the Dashboard page.

New structure:

```text
Desktop: collapsible left sidebar, grouped
  OPERATIONS   Dashboard · Bookings · Orders · Messages
  CONTENT      Tours · Custom Builder · Journal · FAQs · Reviews
  SETTINGS     Brand · Contact · Homepage · Booking rules · Payments
Mobile: keeps the bottom tab bar (Home/Tours/Bookings/Orders/More)
```

- New `/admin/settings` section with tabs, so settings leave the Dashboard entirely:
  - **Brand** — name, logo, tagline, footer legal text
  - **Contact** — email, phone, WhatsApp, address, social links
  - **Homepage** — hero slides, hero image, about image, custom-tour headings
  - **Booking rules** — daily slot capacity, hotel pickup fee, cancellation policy display
  - **Payments** — see below
- Dashboard becomes a real dashboard: revenue / bookings / pending-actions KPIs, today's and this week's tours, and a "needs your attention" list (unpaid bookings, pending reviews, unread messages) with direct links.
- Consistent page furniture across all admin pages: page title, description, primary action button, unified table/card styling, empty states, and toast feedback on every save.
- Unsaved-changes warning on settings forms.

## 2. Payments: Mollie or Stripe, switchable

A `payment_provider` setting (`mollie` | `stripe` | `off`) stored in site settings, plus a live/test mode flag. Checkout reads it at request time, so switching takes effect immediately with no redeploy.

The Payments settings page shows:

- Provider selector: Mollie / Stripe / Payments off (manual requests only)
- Live status panel per provider: key present or missing, test vs live mode, last successful payment
- Maintenance mode toggle + editable maintenance message (already exists, moves here)
- Currency and the customer-facing payment note

Behaviour:

- **Mollie** — your own API key. It is not currently saved in the backend, which is why online payments are effectively in maintenance mode right now. I will ask you for the Mollie key through the secure secret form when we get there (test key first if you prefer).
- **Stripe** — Lovable's built-in Stripe. No account setup or keys from you; card, Apple Pay and Google Pay work out of the box. Charges are created through Lovable's Stripe connection and confirmed by its webhook.
- **Off** — booking form still works and drops a "payment request" into Admin → Bookings, same as today's maintenance mode.

Whichever provider is active, the rest of the app is unchanged: same booking record, same Orders row, same confirmation page, same booking reference, same cancellation policy.

## Technical notes

- Migration: add `payment_provider text not null default 'mollie'` and `payment_mode text not null default 'live'` to `site_settings`.
- Introduce `src/lib/payments.server.ts` as a provider-agnostic layer with `createPayment()` / `getPayment()`; `mollie.server.ts` stays as one implementation, a new `stripe.server.ts` (gateway client per Lovable's Stripe utility) as the other. `checkout.functions.ts` and `booking-changes.server.ts` call the abstraction, not Mollie directly.
- Orders keep the existing `stripe_session_id` / `stripe_payment_intent_id` columns as generic provider references; add a `provider` column so admin can show which one handled each payment.
- Stripe webhook lands at `src/routes/api/public/payments/webhook.ts` (signature-verified) alongside the existing Mollie webhook route; both funnel into the same confirmation logic.
- Admin shell is refactored into `AdminShell` + `AdminSidebar` + a shared `AdminPage` wrapper; settings split into `src/routes/admin.settings.*.tsx` with a shared settings form hook.
- Enabling built-in Stripe requires running Lovable's payments enablement step; I'll do that only if you pick Stripe as the active provider.

## Order of work

1. Migration for provider/mode settings.
2. Payments abstraction + Stripe implementation + webhook.
3. New admin shell, sidebar, and shared page components.
4. Settings section with the five tabs (including Payments).
5. Dashboard rebuild.
6. Verify a test booking end-to-end on the active provider.
