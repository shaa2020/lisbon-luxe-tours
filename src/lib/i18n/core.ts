export const LOCALES = ["en", "pt", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  pt: "PT",
  es: "ES",
};

/** html lang values for each locale */
export const LOCALE_HTML_LANG: Record<Locale, string> = {
  en: "en",
  pt: "pt-PT",
  es: "es",
};

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Parse a pathname into { locale, path } where path has no locale prefix. */
export function splitLocalePath(
  pathname: string,
): { locale: Locale; path: string } {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const [, first, ...rest] = clean.split("/");
  if (isLocale(first) && first !== DEFAULT_LOCALE) {
    const path = "/" + rest.join("/");
    return { locale: first, path: path === "/" ? "/" : path.replace(/\/+$/, "") };
  }
  return { locale: DEFAULT_LOCALE, path: clean };
}

/** Prefix a site path with the locale prefix (English paths stay unprefixed). */
export function localePath(locale: Locale, path: string): string {
  const p = path === "" ? "/" : path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

export const SITE_ORIGIN = "https://tuktuk24lisbon.com";

/** hreflang link alternates for a locale-neutral site path. */
export function hreflangLinks(path: string) {
  return [
    ...LOCALES.map((locale) => ({
      rel: "alternate" as const,
      hrefLang: LOCALE_HTML_LANG[locale],
      href: `${SITE_ORIGIN}${localePath(locale, path)}`,
    })),
    {
      rel: "alternate" as const,
      hrefLang: "x-default",
      href: `${SITE_ORIGIN}${path}`,
    },
  ];
}
