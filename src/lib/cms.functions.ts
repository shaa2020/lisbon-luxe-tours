import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchPublishedBlogPostBySlug,
  fetchPublishedBlogPosts,
  fetchPublishedTourBySlug,
  fetchPublishedTours,
  fetchSiteSettings,
} from "./cms.server";

export const getPublishedTours = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedTours();
});

export const getPublishedTourBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    return fetchPublishedTourBySlug(data.slug);
  });

export const getPublishedBlogPosts = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedBlogPosts();
});

export const getPublishedBlogPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(160) }).parse(data))
  .handler(async ({ data }) => {
    return fetchPublishedBlogPostBySlug(data.slug);
  });

export const getPublicSiteSettings = createServerFn({ method: "GET" }).handler(async () => {
  return fetchSiteSettings();
});
