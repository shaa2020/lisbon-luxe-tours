import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchPublishedBlogPostBySlug,
  fetchPublishedBlogPosts,
  fetchPublishedTourBySlug,
  fetchPublishedTours,
  fetchSiteSettings,
} from "./cms.server";

const localeSchema = z.enum(["en", "pt", "es"]).default("en");
const localeInput = z.object({ locale: localeSchema }).parse;

export const getPublishedTours = createServerFn({ method: "GET" })
  .inputValidator((data) => localeInput(data ?? {}))
  .handler(async ({ data }) => {
    return fetchPublishedTours(data.locale);
  });

export const getPublishedTourBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({ slug: z.string().min(1).max(120), locale: localeSchema })
      .parse((data ?? {}) as Record<string, unknown>),
  )
  .handler(async ({ data }) => {
    return fetchPublishedTourBySlug(data.slug, data.locale);
  });

export const getPublishedBlogPosts = createServerFn({ method: "GET" })
  .inputValidator((data) => localeInput(data ?? {}))
  .handler(async ({ data }) => {
    return fetchPublishedBlogPosts(data.locale);
  });

export const getPublishedBlogPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z
      .object({ slug: z.string().min(1).max(160), locale: localeSchema })
      .parse((data ?? {}) as Record<string, unknown>),
  )
  .handler(async ({ data }) => {
    return fetchPublishedBlogPostBySlug(data.slug, data.locale);
  });

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  return fetchSiteSettings();
});
