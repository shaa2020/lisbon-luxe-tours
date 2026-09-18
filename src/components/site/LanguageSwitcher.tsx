import { useLocale } from "@/lib/i18n/context";
import { LOCALES, LOCALE_LABELS, localePath, splitLocalePath, type Locale } from "@/lib/i18n/core";

const NAMES: Record<Locale, string> = {
  en: "English",
  pt: "Português",
  es: "Español",
};

function switchTo(locale: Locale) {
  if (typeof window === "undefined") return;
  const { path } = splitLocalePath(window.location.pathname);
  const target = localePath(locale, path) + window.location.search + window.location.hash;
  window.location.assign(target);
}

/** Compact EN · PT · ES switcher. Full page load so server content reloads in the new language. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const active = useLocale();
  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label="Language">
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-30">·</span>}
          <button
            type="button"
            onClick={() => switchTo(l)}
            aria-label={NAMES[l]}
            aria-current={l === active ? "true" : undefined}
            className={
              l === active
                ? "font-semibold text-gold"
                : "opacity-70 hover:opacity-100 transition-opacity"
            }
          >
            {LOCALE_LABELS[l]}
          </button>
        </span>
      ))}
    </div>
  );
}
