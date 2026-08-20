/**
 * Centralised GTM dataLayer tracking for Tuk Tuk 24.
 *
 * PRIVACY: never pass personal data (name, email, phone, address, notes,
 * payment details) to any function in this file. Only non-sensitive
 * product/booking analytics data is allowed.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const GTM_ID: string = (import.meta.env?.["VITE_GTM_ID"] as string | undefined)?.trim() || "";

/** SSR-safe dataLayer push. No-ops on the server. */
export function pushToDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {
    /* analytics must never break the site */
  }
}

function pagePath(): string {
  if (typeof window === "undefined") return "";
  return window.location.pathname + window.location.search;
}

function pageLocation(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

export function trackEvent(event: string, params: Record<string, unknown> = {}): void {
  pushToDataLayer({ event, ...params });
}

export function trackPageView(): void {
  if (typeof window === "undefined") return;
  trackEvent("page_view", {
    page_path: pagePath(),
    page_title: document.title,
    page_location: pageLocation(),
  });
}

type TourInfo = { id?: string | null; slug?: string | null; title?: string | null };

function tourId(tour: TourInfo): string {
  return String(tour.id ?? tour.slug ?? "");
}

export function trackTourView(tour: TourInfo, value: number): void {
  trackEvent("tour_view", {
    tour_id: tourId(tour),
    tour_name: tour.title ?? "",
    value,
    currency: "EUR",
  });
}

export function trackBookingCtaClick(
  buttonLocation: string,
  tour?: TourInfo,
): void {
  trackEvent("booking_cta_click", {
    button_location: buttonLocation,
    tour_id: tour ? tourId(tour) : "",
    tour_name: tour?.title ?? "",
    page_path: pagePath(),
  });
}

export function trackBookingStart(tour: TourInfo, value: number): void {
  trackEvent("booking_start", {
    tour_id: tourId(tour),
    tour_name: tour.title ?? "",
    value,
    currency: "EUR",
  });
}

export function trackBookingCompleted(args: {
  transaction_id: string;
  tour_id: string;
  tour_name: string;
  value: number;
}): void {
  const { transaction_id, tour_id, tour_name, value } = args;
  trackEvent("booking_completed", {
    transaction_id,
    tour_id,
    tour_name,
    value,
    currency: "EUR",
    items: [
      {
        item_id: tour_id,
        item_name: tour_name,
        price: value,
        quantity: 1,
      },
    ],
  });
}

export function trackWhatsappClick(location: string): void {
  trackEvent("whatsapp_click", { location, page_path: pagePath() });
}

export function trackPhoneClick(location: string): void {
  trackEvent("phone_click", { location, page_path: pagePath() });
}

export function trackEmailClick(location: string): void {
  trackEvent("email_click", { location, page_path: pagePath() });
}

export function trackContactFormSubmit(formName: string): void {
  trackEvent("contact_form_submit", { form_name: formName, page_path: pagePath() });
}

export function trackDiscountApplied(code: string, discountEur: number): void {
  trackEvent("discount_applied", { coupon: code, discount: discountEur, currency: "EUR" });
}

export function trackDiscountRejected(code: string): void {
  trackEvent("discount_rejected", { coupon: code });
}

export function trackReviewImport(count: number): void {
  trackEvent("review_import", { count });
}
