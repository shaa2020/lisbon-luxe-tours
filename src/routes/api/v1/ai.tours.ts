import { createFileRoute } from "@tanstack/react-router";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { listPublishedTours } from "@/lib/api/data.server";

/** Trimmed, answer-ready tour knowledge for the WhatsApp AI agent. */
export const Route = createFileRoute("/api/v1/ai/tours")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_TOURS" }, async ({ request }) => {
        const tours = await listPublishedTours();
        const data = tours.map((t) => ({
          name: t.title,
          slug: t.slug,
          id: t.id,
          duration: t.duration,
          price_from: t.price,
          sale_price: t.sale_price,
          currency: "EUR",
          pricing_type: t.pricing_type,
          summary: t.tagline,
          description: t.description,
          highlights: t.highlights,
          itinerary: t.itinerary,
          included: t.included,
          not_included: t.not_included,
          pickup: t.pickup,
          booking_url: t.booking_url,
          published: t.active,
        }));
        return apiOk(request, { count: data.length, data });
      }),
    },
  },
});
