import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/context";
import { getAutoDict } from "@/lib/i18n/auto";

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];

function normalize(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Translates the rendered page into the active language using a generated
 * dictionary of the site's English UI copy. Runs after hydration, so React
 * never sees a mismatch; a MutationObserver keeps later renders translated.
 * Database content (tours, destinations, guides) is already translated server-side.
 */
export function AutoTranslate() {
  const locale = useLocale();

  useEffect(() => {
    if (locale === "en") return;
    const dict = getAutoDict(locale);
    if (!dict) return;

    const translateText = (node: Text) => {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return;
      if (parent.closest("[data-no-translate]")) return;
      const raw = node.nodeValue ?? "";
      const key = normalize(raw);
      if (!key || key.length < 2) return;
      const hit = dict[key];
      if (!hit || hit === key) return;
      const leadingWs = raw.match(/^\s*/)?.[0] ?? "";
      const trailingWs = raw.match(/\s*$/)?.[0] ?? "";
      node.nodeValue = `${leadingWs}${hit}${trailingWs}`;
    };

    const translateAttrs = (el: Element) => {
      if (el.closest("[data-no-translate]")) return;
      for (const attr of ATTRS) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        const hit = dict[normalize(val)];
        if (hit && hit !== val) el.setAttribute(attr, hit);
      }
    };

    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) {
        translateText(root as Text);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (SKIP_TAGS.has(el.tagName)) return;
      translateAttrs(el);
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      let current = walker.nextNode();
      while (current) {
        if (current.nodeType === Node.TEXT_NODE) translateText(current as Text);
        else translateAttrs(current as Element);
        current = walker.nextNode();
      }
    };

    // Point canonical / og:url at the localized URL so the language versions index separately.
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical?.href) {
      try {
        const u = new URL(canonical.href);
        if (!u.pathname.startsWith(`/${locale}`)) {
          u.pathname = u.pathname === "/" ? `/${locale}` : `/${locale}${u.pathname}`;
          canonical.href = u.toString();
        }
      } catch {
        /* ignore malformed canonical */
      }
    }

    walk(document.body);

    const observer = new MutationObserver((records) => {
      for (const rec of records) {
        if (rec.type === "characterData" && rec.target.nodeType === Node.TEXT_NODE) {
          translateText(rec.target as Text);
        }
        rec.addedNodes.forEach(walk);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [locale]);

  return null;
}
