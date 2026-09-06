import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { MediaImage } from "@/components/site/MediaImage";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { TourCard } from "@/components/site/TourCard";
import { useTours } from "@/lib/cms";
import { getPublishedDestinationBySlug } from "@/lib/destinations.functions";
import { mapDestination } from "@/lib/destinations";

export const Route = createFileRoute("/destinations/$slug")({
  loader: async ({ params }) => {
    const row = await getPublishedDestinationBySlug({ data: { slug: params.slug } });
    if (!row) throw notFound();
    return { destination: mapDestination(row as Record<string, unknown>) };
  },
  head: ({ params, loaderData }) => {
    const d = loaderData?.destination;
    const url = `https://tuktuk24lisbon.com/destinations/${params.slug}`;
    const canonical = d?.canonicalUrl || url;
    const title = d?.seoTitle || (d ? `${d.name} Tuk Tuk Tours | Tuk Tuk 24 Lisbon` : "Destination | Tuk Tuk 24");
    const description =
      d?.metaDescription ||
      (d?.intro ? d.intro.slice(0, 158) : "Private tuk-tuk tours with licensed local drivers in Lisbon, Portugal.");
    const shareImage = d?.ogImageUrl || d?.imageUrl;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary_large_image" },
        ...(shareImage
          ? [{ property: "og:image", content: shareImage }, { name: "twitter:image", content: shareImage }]
          : []),
        ...(d?.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: d
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://tuktuk24lisbon.com/" },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Destinations",
                    item: "https://tuktuk24lisbon.com/destinations",
                  },
                  { "@type": "ListItem", position: 3, name: d.name, item: canonical },
                ],
              }),
            },
            ...(d.faqs.length > 0
              ? [
                  {
                    type: "application/ld+json",
                    children: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      mainEntity: d.faqs.map((f) => ({
                        "@type": "Question",
                        name: f.q,
                        acceptedAnswer: { "@type": "Answer", text: f.a },
                      })),
                    }),
                  },
                ]
              : []),
          ]
        : [],
    };
  },
  component: DestinationPage,
});

function DestinationPage() {
  const { destination: d } = Route.useLoaderData();
  const { data: allTours = [] } = useTours();
  const related = allTours.filter((t) => d.relatedTourSlugs.includes(t.slug));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <main className="pt-[120px] pb-24">
        <div className="container-x">
          <nav aria-label="Breadcrumb" className="text-[12px] text-body mb-4">
            <Link to="/" className="hover:text-gold">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/destinations" className="hover:text-gold">
              Destinations
            </Link>
            <span className="mx-2">/</span>
            <span className="text-ink">{d.name}</span>
          </nav>

          <p className="eyebrow text-gold mb-3">Lisbon region</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
            {d.heading || `${d.name} by tuk-tuk`}
          </h1>
          {d.intro && <p className="mt-4 max-w-2xl text-body leading-relaxed">{d.intro}</p>}

          {d.imageUrl && (
            <div className="mt-8 rounded-2xl overflow-hidden">
              <MediaImage
                src={d.imageUrl}
                alt={d.imageAlt || `${d.name}, Lisbon — Tuk Tuk 24 private tour`}
                wrapperClassName="w-full aspect-[16/8]"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {d.bodySections.length > 0 && (
            <div className="mt-12 max-w-3xl space-y-8">
              {d.bodySections.map((s, i) => (
                <section key={i}>
                  {s.heading && <h2 className="font-display text-2xl font-bold">{s.heading}</h2>}
                  <p className="mt-3 text-body leading-relaxed whitespace-pre-line">{s.body}</p>
                </section>
              ))}
            </div>
          )}

          {related.length > 0 && (
            <section className="mt-16">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                Tours that go to {d.name}
              </h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((t) => (
                  <TourCard key={t.slug} tour={t} />
                ))}
              </div>
            </section>
          )}

          {d.faqs.length > 0 && (
            <section className="mt-16 max-w-3xl">
              <h2 className="font-display text-2xl md:text-3xl font-bold">
                {d.name} questions, answered
              </h2>
              <dl className="mt-6 space-y-6">
                {d.faqs.map((f, i) => (
                  <div key={i}>
                    <dt className="font-semibold text-ink">{f.q}</dt>
                    <dd className="mt-2 text-body leading-relaxed whitespace-pre-line">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {d.lastVerifiedAt && (
            <p className="mt-12 text-[12px] text-body">
              Last verified by our team on {new Date(d.lastVerifiedAt).toLocaleDateString("en-GB")}.
            </p>
          )}

          <div className="mt-12">
            <Link
              to="/tours"
              className="inline-flex items-center justify-center rounded-full bg-gold px-7 py-3.5 text-[12px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-ink"
            >
              See all Lisbon tours →
            </Link>
          </div>
        </div>
      </main>
      <WhatsappFab />
      <Footer />
    </div>
  );
}
