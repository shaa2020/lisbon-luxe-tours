# Tuk Tuk 24 — GTM tracking

## 1. Installation

Google Tag Manager is loaded from `src/routes/__root.tsx` using the snippet in
`src/components/analytics/Gtm.tsx`:

- `gtmHeadScript` — inline loader injected into `<head>` (guarded by `w.__gtmLoaded`, so it initialises once).
- `<GtmNoScript />` — the `<noscript>` iframe fallback in `<body>`.
- `<GtmPageViews />` — fires one `page_view` per resolved route (initial load + client-side navigation, deduped by path).

If `VITE_GTM_ID` is empty, nothing is injected and the site works normally.
All tracking helpers still no-op safely (and are SSR-safe).

## 2. Environment variable

Add your container ID (format `GTM-XXXXXXX`) to the project's environment variables:

```
VITE_GTM_ID=GTM-XXXXXXX
```

Set it in the Lovable project environment (and in `.env` locally). It must be
prefixed `VITE_` so it reaches the browser. Rebuild/redeploy after changing it.

## 3. Events

All events are pushed through `src/lib/analytics.ts` to `window.dataLayer`.

| Event | Parameters | Where it fires |
|---|---|---|
| `page_view` | `page_path`, `page_title`, `page_location` | Every route resolve (`GtmPageViews`) |
| `tour_view` | `tour_id`, `tour_name`, `value`, `currency` | Tour detail page `/tours/$slug` on mount |
| `booking_cta_click` | `button_location`, `tour_id`, `tour_name`, `page_path` | Booking panel "Continue"/"Reserve" buttons; mobile "Check Availability" bar |
| `booking_start` | `tour_id`, `tour_name`, `value`, `currency` | After validation, when checkout/reservation request is submitted (`TourBookingPanel`, `BookingModal`) |
| `booking_completed` | `transaction_id`, `tour_id`, `tour_name`, `value`, `currency`, `items` | `/booking/success` only when the server confirms `paid === true` |
| `whatsapp_click` | `location`, `page_path` | Floating WhatsApp button, footer, contact page, tours page, tour concierge link, booking modal WhatsApp send |
| `phone_click` | `location`, `page_path` | Nav phone links, footer, contact page |
| `email_click` | `location`, `page_path` | Footer, contact page |
| `contact_form_submit` | `form_name`, `page_path` | Contact page form, after successful validation |

### booking_completed logic

`src/routes/booking.success.tsx` calls the server function `confirmCheckout`.
The event fires **only** when the payment provider confirms payment (`r.paid`).
`transaction_id` is the booking reference (`booking_id`) returned by the backend,
falling back to the payment session id. A `sessionStorage` guard prevents a
duplicate conversion if the page is refreshed.

Clicking "Book now" or opening the booking sheet never fires this event.

## 4. Privacy

No personal data is pushed to the dataLayer: no names, emails, phone/WhatsApp
numbers, addresses, notes or payment details. Only tour identifiers, amounts,
currency, page paths and click locations.

## 5. Testing

1. Set `VITE_GTM_ID`, reload the site.
2. In GTM click **Preview**, enter the site URL, and connect.
3. In the Tag Assistant timeline verify events appear as you navigate, click
   WhatsApp/phone/email, click a booking CTA, start a checkout, and complete a
   test payment.
4. Alternatively run `window.dataLayer` in the browser console.

## 6. Connecting destinations inside GTM

Create a **Custom Event** trigger for each event name above (exact match) and
**Data Layer Variables** for each parameter (`tour_id`, `tour_name`, `value`,
`currency`, `transaction_id`, `items`, `page_path`, `location`, `button_location`,
`form_name`, `page_title`, `page_location`).

- **GA4** — add a GA4 Configuration tag with your Measurement ID, then a GA4
  Event tag per event, mapping the data layer variables as event parameters.
  Mark `booking_completed` as a conversion/key event in GA4.
- **Google Ads** — add a Conversion Linker tag (All Pages) and a Google Ads
  Conversion Tracking tag on the `booking_completed` trigger, using your
  conversion ID/label, `value` = `{{DLV - value}}`, currency `EUR`,
  transaction ID `{{DLV - transaction_id}}`.
- **Meta** — add the Meta Pixel base tag (All Pages) plus a Pixel event tag:
  `Purchase` on `booking_completed`, `InitiateCheckout` on `booking_start`,
  `ViewContent` on `tour_view`, `Contact` on `whatsapp_click`/`contact_form_submit`.
- **TikTok** — add the TikTok Pixel base tag (All Pages) plus event tags:
  `CompletePayment` on `booking_completed`, `InitiateCheckout` on `booking_start`,
  `ViewContent` on `tour_view`, `Contact` on `whatsapp_click`.

Publish the GTM container when finished.
