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

## 2. Payments: an installable gateway store in the admin

Admin → Settings → Payments becomes a small "gateway store": a grid of pre-built payment gateway cards you install and switch between yourself, no code.

```text
  [ Stripe ]        [ Mollie ]         [ PayPal ]        [ Manual / Off ]
  Built-in           Your API key       Your API keys     No online payment
  Not installed      Installed · Live   Coming soon       Fallback
  [ Install ]        [ Active ]         [ Install ]       [ Use this ]
```

Each card has:

- Logo, short description, which payment methods it supports (cards, iDEAL, Apple/Google Pay, MB Way, etc.)
- Status badge: Not installed / Installed / Active / Key missing
- **Install** button that opens a guided setup: what you need, where to get it, then a secure form for the key. Keys are never stored in the code or shown back.
- **Test connection** button that makes a real call to the provider and reports success or the exact error
- **Set as active** — only one gateway takes live payments at a time; switching is instant, no redeploy
- Test / Live mode switch per gateway, with a clear warning banner on the site when in test mode

Gateways shipped:

- **Stripe** — Lovable's built-in Stripe. One-click install, no account keys to paste; cards, Apple Pay and Google Pay work out of the box.
- **Mollie** — your own API key (iDEAL, Bancontact, cards, SEPA). Your key isn't saved in the backend right now, which is why online payments sit in maintenance mode; the install flow will ask for it securely.
- **PayPal** — same install pattern (client ID + secret), built as the third card.
- **Manual / Off** — booking form still works and drops a "payment request" into Admin → Bookings, exactly like today's maintenance mode.

Also on this page: maintenance toggle and message (moves here from the Dashboard), currency, and the customer-facing payment note.

Whichever gateway is active, the rest of the app is unchanged: same booking record, same Orders row, same confirmation page, same booking reference, same cancellation policy. Orders show which gateway processed each payment.

## Technical notes

- Migration: new `payment_gateways` table (`provider`, `enabled`, `mode`, `is_active`, `config` jsonb, timestamps), admin-only RLS; plus `payment_provider` on `site_settings` as the pointer to the active one.
- `src/lib/payments.server.ts` — provider-agnostic `createPayment()` / `getPayment()` / `testConnection()` with a registry of gateway adapters. `mollie.server.ts` becomes one adapter; new `stripe.server.ts` (gateway client per Lovable's Stripe utility) and `paypal.server.ts` join it. `checkout.functions.ts` and `booking-changes.server.ts` call the abstraction, never a provider directly.
- Secret keys go through Lovable's secure secret storage (`MOLLIE_API_KEY`, `PAYPAL_CLIENT_ID`/`PAYPAL_SECRET`); the admin UI only reports whether a key is present, never its value.
- Orders keep `stripe_session_id` / `stripe_payment_intent_id` as generic provider references; add a `provider` column.
- Webhooks: Stripe at `src/routes/api/public/payments/webhook.ts` (signature-verified), PayPal alongside it, existing Mollie route stays; all funnel into one confirmation path.
- Admin shell refactored into `AdminShell` + `AdminSidebar` + shared `AdminPage`; settings split into `src/routes/admin.settings.*.tsx` with a shared settings form hook.
- Adding a future gateway means one adapter file plus one entry in the registry — the admin store picks it up automatically.


## Order of work

1. Migration for provider/mode settings.
2. Payments abstraction + Stripe implementation + webhook.
3. New admin shell, sidebar, and shared page components.
4. Settings section with the five tabs (including Payments).
5. Dashboard rebuild.
6. Verify a test booking end-to-end on the active provider.
