import { createFileRoute } from "@tanstack/react-router";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { businessInfo } from "@/lib/api/data.server";

export const Route = createFileRoute("/api/v1/ai/business")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_BUSINESS" }, async ({ request }) => {
        const data = await businessInfo();
        return apiOk(request, { data });
      }),
    },
  },
});
