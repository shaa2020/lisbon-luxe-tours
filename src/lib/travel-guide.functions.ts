import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_LOCALE, LOCALES } from "./i18n/core";

const localeInput = z.object({ locale: z.enum(LOCALES).optional() });
import {
  fetchGuideBySlug,
  fetchGuideCategories,
  fetchGuideRedirects,
  fetchPublishedGuideSlugs,
  fetchPublishedGuides,
} from "./travel-guide.server";

export const getGuideCategories = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => localeInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    return fetchGuideCategories(data.locale ?? DEFAULT_LOCALE);
  });

export const getPublishedGuides = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => localeInput.parse(data ?? {}))
  .handler(async ({ data }) => {
    return fetchPublishedGuides(data.locale ?? DEFAULT_LOCALE);
  });

export const getPublishedGuideSlugs = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedGuideSlugs();
});

export const getGuideBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ slug: z.string().min(1).max(160), locale: z.enum(LOCALES).optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    return fetchGuideBySlug(data.slug, data.locale ?? DEFAULT_LOCALE);
  });

export const getGuideRedirects = createServerFn({ method: "GET" }).handler(async () => {
  return fetchGuideRedirects();
});
