import type { Locale } from "./core";
import { AUTO_PT } from "./auto.pt";
import { AUTO_ES } from "./auto.es";

const DICTS: Partial<Record<Locale, Record<string, string>>> = {
  pt: AUTO_PT,
  es: AUTO_ES,
};

export function getAutoDict(locale: Locale): Record<string, string> | null {
  return DICTS[locale] ?? null;
}
