import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  fetchPublishedDestinationBySlug,
  fetchPublishedDestinations,
} from "./destinations.server";

export const getPublishedDestinations = createServerFn({ method: "GET" }).handler(async () => {
  return fetchPublishedDestinations();
});

export const getPublishedDestinationBySlug = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }) => {
    return fetchPublishedDestinationBySlug(data.slug);
  });
