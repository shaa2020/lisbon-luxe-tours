import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchPublishedDestinationBySlug,
  fetchPublishedDestinations,
} from "./destinations.server";

const localeSchema = z.enum(["en", "pt", "es"]).default("en");

export const getPublishedDestinations = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ locale: localeSchema }).parse((data ?? {}) as Record<string, unknown>))
  .handler(async ({ data }) => {
    return fetchPublishedDestinations(data.locale);
  });

export const getPublishedDestinationBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) =>
    z.object({ slug: z.string().min(1).max(120), locale: localeSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    return fetchPublishedDestinationBySlug(data.slug, data.locale);
  });
