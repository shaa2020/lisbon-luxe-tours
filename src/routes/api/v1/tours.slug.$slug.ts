import { createFileRoute } from "@tanstack/react-router";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { getPublishedTour } from "@/lib/api/data.server";

export const Route = createFileRoute("/api/v1/tours/slug/$slug")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_TOURS" }, async ({ request, params }) => {
        const data = await getPublishedTour("slug", params["slug"]!);
        return apiOk(request, { data });
      }),
    },
  },
});
