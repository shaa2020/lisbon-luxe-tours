import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { MediaImage } from "@/components/site/MediaImage";
import { getPublishedDestinations } from "@/lib/destinations.functions";
import { mapDestination } from "@/lib/destinations";

const URL = "https://tuktuk24lisbon.com/destinations";

export const Route = createFileRoute("/destinations/")({
  loader: async () => {
    const rows = await getPublishedDestinations();
    return { destinations: (rows ?? []).map((r) => mapDestination(r as Record<string, unknown>)) };
  },
  head: () => ({
    meta: [
      { title: "Lisbon Tuk Tuk Destinations — Alfama, Belém, Sintra & Cascais" },
      {
        name: "description",
        content:
          "Where our private tuk-tuk tours go: Alfama, Belém, Sintra, Cascais and central Lisbon — what to expect in each area, how long to allow and which tour fits.",
      },
      { property: "og:title", content: "Where our Lisbon tuk-tuk tours go" },
      {
        property: "og:description",
        content: "Alfama, Belém, Sintra, Cascais and central Lisbon — area by area, with the tours that cover them.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: DestinationsIndex,
});

function DestinationsIndex() {
  const { destinations } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="container-x pt-[120px] pb-24">
        <p className="eyebrow text-gold mb-3">Destinations</p>
        <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
          Where our private tuk-tuk tours go
        </h1>
        <p className="mt-4 max-w-2xl text-body leading-relaxed">
          Each area below is covered by our licensed local drivers. Pick a neighbourhood to see what
          the ride is like, how long to allow and which tours go there.
        </p>

        {destinations.length === 0 ? (
          <p className="mt-12 text-body">
            Destination pages are being written.{" "}
            <Link to="/tours" className="text-gold underline">
              Browse all tours
            </Link>{" "}
            in the meantime.
          </p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((d) => (
              <Link
                key={d.id}
                to="/destinations/$slug"
                params={{ slug: d.slug }}
                className="group block bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] hover:-translate-y-1 transition-all duration-500"
              >
                {d.imageUrl && (
                  <div className="aspect-[16/10] overflow-hidden">
                    <MediaImage
                      src={d.imageUrl}
                      alt={d.imageAlt || `${d.name} seen from a Tuk Tuk 24 tour`}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-display text-xl font-bold">{d.name}</h2>
                  {d.intro && (
                    <p className="mt-2 text-sm text-body line-clamp-3">{d.intro}</p>
                  )}
                  <span className="mt-4 inline-block text-[12px] font-semibold uppercase tracking-widest text-gold">
                    Explore {d.name} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
