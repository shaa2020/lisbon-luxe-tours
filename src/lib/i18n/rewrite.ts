import { DEFAULT_LOCALE, isLocale, localePath, splitLocalePath, type Locale } from "./core";

export type LocaleState = { current: Locale };

/**
 * Locale prefix routing (/pt, /es) without duplicating any route file.
 *
 * `input`  — strips the locale prefix before the router matches a route.
 * `output` — puts the prefix back on every URL the router writes to history,
 *            so links and navigations stay inside the active language.
 */
export function createLocaleRewrite() {
  const state: LocaleState = { current: DEFAULT_LOCALE };

  const rewrite = {
    input: ({ url }: { url: URL }) => {
      const first = url.pathname.split("/")[1];
      if (!isLocale(first) || first === DEFAULT_LOCALE) {
        state.current = DEFAULT_LOCALE;
        return undefined;
      }
      const { locale, path } = splitLocalePath(url.pathname);
      state.current = locale;
      const next = new URL(url);
      next.pathname = path || "/";
      return next;
    },
    output: ({ url }: { url: URL }) => {
      if (state.current === DEFAULT_LOCALE) return undefined;
      const first = url.pathname.split("/")[1];
      if (isLocale(first) && first !== DEFAULT_LOCALE) return undefined;
      const next = new URL(url);
      next.pathname = localePath(state.current, url.pathname);
      return next;
    },
  };

  return { state, rewrite };
}
