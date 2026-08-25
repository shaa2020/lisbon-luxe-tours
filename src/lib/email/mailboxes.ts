/**
 * Which mailbox each outgoing email comes from.
 * Replies land in the matching inbox on tuktuk24lisbon.com.
 */
export const FROM_DOMAIN = "tuktuk24lisbon.com";

export const MAILBOXES = {
  bookings: `bookings@${FROM_DOMAIN}`,
  hello: `hello@${FROM_DOMAIN}`,
  support: `support@${FROM_DOMAIN}`,
} as const;

/** Anything tied to a specific booking goes out from bookings@. */
const BOOKING_LABELS = new Set([
  "booking-notice",
  "booking_confirmation",
  "payment_request",
  "booking_updated",
  "reminder",
  "tour_reminder",
  "cancellation",
  "refund",
  "invoice",
  "review_request",
  "custom",
  "free_form",
]);

/** General enquiries, newsletter and site-wide messages go out from hello@. */
const GENERAL_LABELS = new Set([
  "contact-confirmation",
  "contact_confirmation",
  "contact",
  "welcome",
  "subscribe",
  "newsletter-welcome",
]);

export function mailboxFor(label?: string | null): string {
  const key = (label || "").trim().toLowerCase();
  if (BOOKING_LABELS.has(key)) return MAILBOXES.bookings;
  if (GENERAL_LABELS.has(key)) return MAILBOXES.hello;
  return MAILBOXES.support;
}

/** Full From header, e.g. `Tuk Tuk 24 <bookings@tuktuk24lisbon.com>`. */
export function fromHeader(brandName: string, label?: string | null) {
  return `${brandName} <${mailboxFor(label)}>`;
}
