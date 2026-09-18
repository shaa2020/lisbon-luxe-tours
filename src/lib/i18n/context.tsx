import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./core";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Current UI locale; English everywhere the provider is absent (admin, checkout, emails). */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

const Dicts: Partial<Record<Locale, Record<string, string>>> = {};

function lookup(locale: Locale, key: string): string | null {
  if (locale === DEFAULT_LOCALE) return DICT_EN[key] ?? null;
  const dict = Dicts[locale];
  return dict?.[key] ?? DICT_EN[key] ?? null;
}

/**
 * Register a locale dictionary (called once from the dict modules).
 */
export function registerDict(locale: Locale, dict: Record<string, string>) {
  if (locale !== DEFAULT_LOCALE) Dicts[locale] = dict;
}

/** Translate a UI string; falls back to English, then to the key itself. */
export function translate(locale: Locale, key: string, fallback?: string): string {
  return lookup(locale, key) ?? fallback ?? DICT_EN[key] ?? key;
}

/** Hook form: const t = useT(); t("nav.tours") */
export function useT() {
  const locale = useLocale();
  return (key: string, fallback?: string) => translate(locale, key, fallback);
}

/** English dictionary of shared UI strings — the source of truth for keys. */
export const DICT_EN: Record<string, string> = {
  // Nav / common chrome
  "nav.tours": "Tours",
  "nav.destinations": "Destinations",
  "nav.journal": "Journal",
  "nav.about": "About",
  "nav.contact": "Contact",
  "nav.faq": "FAQ",
  "nav.reviews": "Reviews",
  "nav.book": "Book Now",
  "nav.customTour": "Custom Tour",
  "nav.menu": "Menu",
  "nav.close": "Close",

  // Common buttons / labels
  "common.bookNow": "Book now",
  "common.from": "From",
  "common.perPerson": "per person",
  "common.perVehicle": "per transfer",
  "common.viewTour": "View tour",
  "common.viewAll": "View all",
  "common.readMore": "Read more",
  "common.learnMore": "Learn more",
  "common.duration": "Duration",
  "common.price": "Price",
  "common.guests": "Guests",
  "common.date": "Date",
  "common.time": "Time",
  "common.freeCancellation": "Free cancellation up to 24 hours before",
  "common.whatsapp": "WhatsApp",
  "common.callUs": "Call us",
  "common.email": "Email",
  "common.backHome": "Back home",
  "common.seeOurTours": "See our tours",
  "common.language": "Language",

  // Booking panel
  "booking.title": "Book this tour",
  "booking.chooseDate": "Choose a date",
  "booking.chooseTime": "Choose a time",
  "booking.anyTime": "Or choose any time",
  "booking.guests": "Guests",
  "booking.hotelPickup": "Hotel pick-up & drop-off",
  "booking.pickupNote": "Pick-up from your hotel, apartment or cruise port",
  "booking.summary": "Booking summary",
  "booking.total": "Total",
  "booking.expressCheckout": "Express checkout",
  "booking.reserveWhatsapp": "Reserve via WhatsApp",
  "booking.selectDuration": "Select duration",

  // Footer
  "footer.tagline": "Family-run private tuk tuk tours in Lisbon",
  "footer.explore": "Explore",
  "footer.contact": "Contact",
  "footer.legal": "Legal",
  "footer.privacy": "Privacy policy",
  "footer.terms": "Terms & conditions",
  "footer.cookies": "Cookies",
  "footer.followUs": "Follow us",
  "footer.rights": "All rights reserved.",

  // 404
  "notfound.title": "Lost in Lisbon?",
  "notfound.body":
    "This page doesn't exist — but the best views in the city are only a short ride away.",
};
