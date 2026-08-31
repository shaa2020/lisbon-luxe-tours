import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, badRequest, preflight, withApi } from "@/lib/api/core.server";
import { checkAvailability } from "@/lib/api/data.server";

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  time: z.string().max(10).optional(),
  number_of_people: z.coerce.number().int().min(1).max(60).optional(),
  tour_id: z.string().max(80).optional(),
});

export const Route = createFileRoute("/api/v1/availability")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_AVAILABILITY" }, async ({ request, url }) => {
        const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
        if (!parsed.success) badRequest("Invalid query parameters", parsed.error.issues);

        const result = await checkAvailability({
          date: parsed.data.date,
          time: parsed.data.time ?? null,
          partySize: parsed.data.number_of_people ?? null,
          tourId: parsed.data.tour_id ?? null,
        });
        return apiOk(request, result);
      }),
    },
  },
});
