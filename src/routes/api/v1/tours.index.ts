import { createFileRoute } from "@tanstack/react-router";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { listPublishedTours } from "@/lib/api/data.server";

export const Route = createFileRoute("/api/v1/tours/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_TOURS" }, async ({ request }) => {
        const data = await listPublishedTours();
        return apiOk(request, { count: data.length, data });
      }),
    },
  },
});
