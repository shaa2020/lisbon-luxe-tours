import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchGuideBySlug,
  fetchGuideCategories,
  fetchGuideRedirects,
  fetchPublishedGuideSlugs,
  fetchPublishedGuides,
} from "./travel-guide.server";

export const getGuideCategories = createServerFn({ method: "GET" }).handler(async () => {
  return fetchGuideCategories();
});

export const getPublishedGuides = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedGuides();
});

export const getPublishedGuideSlugs = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedGuideSlugs();
});

export const getGuideBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(160) }).parse(data))
  .handler(async ({ data }) => {
    return fetchGuideBySlug(data.slug);
  });

export const getGuideRedirects = createServerFn({ method: "GET" }).handler(async () => {
  return fetchGuideRedirects();
});
