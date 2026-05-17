import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { tours, type Tour } from "@/data/tours";
import { TourCard } from "@/components/site/TourCard";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/tours/$slug")({
  loader: ({ params }): { tour: Tour } => {
    const tour = tours.find((t) => t.slug === params.slug);
    if (!tour) throw notFound();
    return { tour };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.tour.title} — Lusitano Private Tours` },
          { name: "description", content: loaderData.tour.description },
          { property: "og:title", content: loaderData.tour.title },
          { property: "og:description", content: loaderData.tour.description },
          { property: "og:image", content: loaderData.tour.image },
          { property: "twitter:image", content: loaderData.tour.image },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="text-center">
        <p className="eyebrow text-gold mb-4">Not Found</p>
        <h1 className="font-serif text-4xl mb-6">This tour doesn't exist</h1>
        <Link to="/tours" className="underline">Back to all tours</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <p>{error.message}</p>
    </div>
  ),
  component: TourPage,
});

function TourPage() {
  const { tour } = Route.useLoaderData();
  const related = tours.filter((t) => t.slug !== tour.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />

      {/* Hero */}
      <section className="relative h-[75vh] min-h-[500px] overflow-hidden bg-ink">
        <img
          src={tour.image}
          alt={tour.title}
          width={1600}
          height={900}
          className="absolute inset-0 w-full h-full object-cover opacity-70 animate-[scale-in_1.4s_var(--ease-out-expo)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/40" />
        <div className="absolute inset-0 flex items-end pb-16 md:pb-24 px-6 md:px-10">
          <div className="max-w-7xl mx-auto w-full">
            <p className="eyebrow text-gold-muted mb-4 animate-[fade-up_0.8s_var(--ease-out-expo)_both]">
              {tour.category} · {tour.duration}
            </p>
            <h1 className="font-serif text-5xl md:text-7xl italic text-white max-w-3xl leading-[0.95] animate-[fade-up_1s_var(--ease-out-expo)_both]">
              {tour.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Overview + Booking widget */}
      <section className="px-6 md:px-10 max-w-7xl mx-auto py-16 md:py-24 grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-12">
          <div>
            <p className="eyebrow text-gold mb-4">Overview</p>
            <p className="text-xl leading-relaxed text-ink/80 text-pretty">{tour.description}</p>
          </div>

          {/* Itinerary timeline */}
          <div>
            <p className="eyebrow text-gold mb-4">Itinerary</p>
            <h2 className="font-serif text-3xl md:text-4xl mb-8">A day, hour by hour</h2>
            <ol className="border-l border-ink/15 space-y-8 pl-8">
              {tour.itinerary.map((step, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[37px] top-1 size-3.5 rounded-full bg-gold ring-4 ring-paper" />
                  <p className="font-mono text-xs text-gold mb-1">{step.time}</p>
                  <h3 className="font-serif text-2xl mb-1">{step.title}</h3>
                  <p className="text-ink/60">{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Included */}
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="eyebrow text-gold mb-4">Included</p>
              <ul className="space-y-3">
                {tour.included.map((i) => (
                  <li key={i} className="flex gap-3 text-ink/80">
                    <span className="text-gold">✓</span> {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-ink/40 mb-4">Not Included</p>
              <ul className="space-y-3">
                {tour.notIncluded.map((i) => (
                  <li key={i} className="flex gap-3 text-ink/60">
                    <span className="text-ink/30">—</span> {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Highlights */}
          <div>
            <p className="eyebrow text-gold mb-4">Highlights</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {tour.highlights.map((h) => (
                <div
                  key={h}
                  className="px-5 py-4 bg-secondary rounded-xl border border-ink/5 text-sm"
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky booking widget */}
        <aside className="md:sticky md:top-28 h-fit">
          <div className="bg-ink text-paper p-8 rounded-3xl shadow-2xl">
            <p className="eyebrow text-gold-muted mb-2">From</p>
            <p className="font-serif text-5xl mb-1">€{tour.priceFrom}</p>
            <p className="text-paper/60 text-sm mb-8">per private party · {tour.duration}</p>

            <div className="space-y-3 mb-6">
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-paper/50 mb-1">Date</p>
                <input
                  type="date"
                  className="bg-transparent w-full text-sm focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <p className="text-[9px] uppercase tracking-widest text-paper/50 mb-1">Guests</p>
                <select className="bg-transparent w-full text-sm focus:outline-none">
                  <option className="bg-ink">2 guests</option>
                  <option className="bg-ink">3 guests</option>
                  <option className="bg-ink">4 guests</option>
                  <option className="bg-ink">5+ guests</option>
                </select>
              </div>
            </div>

            <button className="w-full bg-gold text-ink py-4 rounded-xl eyebrow font-medium hover:bg-gold-muted transition-colors mb-3">
              Check Availability
            </button>
            <a
              href="https://wa.me/351912345678"
              className="w-full block text-center border border-white/15 py-4 rounded-xl eyebrow hover:bg-white/5 transition-colors"
            >
              WhatsApp Concierge
            </a>
            <p className="text-xs text-paper/40 mt-6 text-center">
              Free cancellation up to 24h before
            </p>
          </div>
        </aside>
      </section>

      {/* Related */}
      <section className="bg-secondary py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <h2 className="font-serif text-4xl">You may also love</h2>
            <Link to="/tours" className="eyebrow border-b border-gold pb-1 hover:text-gold">
              All tours →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {related.map((t) => (
              <TourCard key={t.slug} tour={t} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
