import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TourCard } from "@/components/site/TourCard";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { TourBookingPanel } from "@/components/site/TourBookingPanel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { StarRating } from "@/components/site/StarRating";
import { useTour, useTours, tourPricing, mapTour } from "@/lib/cms";
import { getPublishedTourBySlug } from "@/lib/cms.functions";
import { aggregateReviews, useTourReviews } from "@/lib/reviews";

export const Route = createFileRoute("/tours/$slug")({
  loader: async ({ params }) => {
    const row = await getPublishedTourBySlug({ data: { slug: params.slug } });
    return { tour: row ? mapTour(row as Parameters<typeof mapTour>[0]) : null };
  },
  head: ({ params, loaderData }) => {
    const tour = loaderData?.tour;
    const url = `https://tuktuk24lisbon.com/tours/${params.slug}`;
    const title = tour ? `${tour.title} — Private Tour | Tuk Tuk 24` : `Private Tour — Tuk Tuk 24`;
    const description = tour?.description?.slice(0, 158) ?? "Private tuk-tuk and luxury tours across Lisbon and Portugal.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(tour?.image ? [{ property: "og:image", content: tour.image }, { name: "twitter:image", content: tour.image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: tour
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: tour.title,
                description: tour.description,
                image: tour.image,
                brand: { "@type": "Brand", name: "Tuk Tuk 24" },
                offers: {
                  "@type": "Offer",
                  price: tour.salePrice ?? tour.priceFrom,
                  priceCurrency: "EUR",
                  availability: "https://schema.org/InStock",
                  url,
                },
              }),
            },
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://tuktuk24lisbon.com/" },
                  { "@type": "ListItem", position: 2, name: "Tours", item: "https://tuktuk24lisbon.com/tours" },
                  { "@type": "ListItem", position: 3, name: tour.title, item: url },
                ],
              }),
            },
          ]
        : [],
    };
  },
  component: TourPage,
});

function TourPage() {
  const { slug } = Route.useParams();
  const { data: tour, isLoading, isError, error } = useTour(slug);
  const { data: allTours = [] } = useTours();
  const { data: reviews = [] } = useTourReviews(slug);
  const reviewStats = aggregateReviews(reviews);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <Nav />
        <div className="container-x pt-[120px] pb-24">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-1/2 bg-cloud rounded" />
            <div className="h-[420px] bg-cloud rounded-2xl" />
            <div className="h-4 w-full bg-cloud rounded" />
            <div className="h-4 w-5/6 bg-cloud rounded" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-ink">{(error as Error)?.message ?? "Failed to load tour."}</p>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="text-center">
          <p className="eyebrow text-gold mb-4">Not Found</p>
          <h1 className="font-display text-4xl font-bold mb-6 text-ink">This tour doesn't exist</h1>
          <Link to="/tours" className="text-gold font-semibold hover:text-ink transition">
            ← Back to all tours
          </Link>
        </div>
      </div>
    );
  }

  const related = allTours.filter((t) => t.slug !== tour.slug).slice(0, 3);
  const pricing = tourPricing(tour);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip pb-24 lg:pb-0">
      <a id="top" />
      <Nav overlay />

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden bg-ink">
        <img
          src={tour.image}
          alt={tour.title}
          className="absolute inset-0 w-full h-full object-cover animate-[scale-in_1.4s_var(--ease-out-expo)]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-ink/40" />
        <div className="absolute inset-0 flex items-end pb-16 md:pb-20">
          <div className="container-x w-full text-white">
            <nav className="flex items-center gap-2 text-[12px] text-white/70 mb-4 animate-[fade-up_0.7s_var(--ease-out-expo)_both]">
              <Link to="/" className="hover:text-gold">Home</Link>
              <span>/</span>
              <Link to="/tours" className="hover:text-gold">Tours</Link>
              <span>/</span>
              <span className="text-white">{tour.category}</span>
            </nav>
            <p className="eyebrow text-gold mb-3 animate-[fade-up_0.8s_var(--ease-out-expo)_both]">
              {tour.category} · {tour.duration}
            </p>
            <h1 className="font-display font-bold text-4xl md:text-6xl text-white max-w-3xl leading-[1.05] mb-5 animate-[fade-up_1s_var(--ease-out-expo)_both]">
              {tour.title}
            </h1>
            <div className="flex flex-wrap items-center gap-5 text-sm text-white/85 animate-[fade-up_1.1s_var(--ease-out-expo)_both]">
              <span className="flex items-center gap-1.5">
                <StarRating value={reviewStats.count ? reviewStats.average : 5} readOnly size={14} />
                {reviewStats.count > 0
                  ? <>{reviewStats.average.toFixed(1)} ({reviewStats.count} review{reviewStats.count === 1 ? "" : "s"})</>
                  : <>New tour · be the first to review</>}
              </span>
              {tour.tagline && <span className="flex items-center gap-1.5">📍 {tour.tagline}</span>}
              <span className="flex items-center gap-1.5">⏱ {tour.duration}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="container-x py-14 md:py-20 grid lg:grid-cols-3 gap-10 lg:gap-12">
        <div className="lg:col-span-2 space-y-14">
          <div>
            <p className="eyebrow text-gold mb-3">Overview</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-4">About this experience</h2>
            <p className="text-body text-lg leading-relaxed">{tour.description}</p>
          </div>

          {tour.highlights.length > 0 && (
            <div>
              <p className="eyebrow text-gold mb-3">Highlights</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-6">What makes it special</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {tour.highlights.map((h) => (
                  <div key={h} className="flex items-start gap-3 px-5 py-4 bg-cloud/60 rounded-xl border border-border">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-gold/15 text-gold flex items-center justify-center text-[12px] font-bold">✓</span>
                    <span className="text-sm text-ink">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tour.itinerary.length > 0 && (
            <div>
              <p className="eyebrow text-gold mb-3">Itinerary</p>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-8">A day, hour by hour</h2>
              <ol className="border-l-2 border-gold/30 space-y-8 pl-8">
                {tour.itinerary.map((step, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[41px] top-1 w-5 h-5 rounded-full bg-gold ring-4 ring-paper" />
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-1">{step.time}</p>
                    <h3 className="font-display text-xl font-semibold text-ink mb-1">{step.title}</h3>
                    <p className="text-body leading-relaxed">{step.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {(tour.included.length > 0 || tour.notIncluded.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-8 p-7 bg-cloud/60 rounded-2xl border border-border">
              <div>
                <p className="eyebrow text-gold mb-4">What's Included</p>
                <ul className="space-y-3">
                  {tour.included.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink">
                      <span className="text-gold font-bold">✓</span> {i}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="eyebrow text-ink/50 mb-4">Not Included</p>
                <ul className="space-y-3">
                  {tour.notIncluded.map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-body">
                      <span className="text-ink/30">✕</span> {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <ReviewsSection tourId={tour.id ?? null} tourSlug={tour.slug} tourTitle={tour.title} />
        </div>

        {/* Sticky booking panel (desktop) */}
        <aside className="hidden lg:block lg:sticky lg:top-28 h-fit">
          <TourBookingPanel tour={tour} />
          <a
            href="https://wa.me/351922024690"
            className="mt-3 w-full block text-center border border-border text-ink py-3.5 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
          >
            WhatsApp Concierge
          </a>
        </aside>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="bg-cloud/60 py-20 md:py-24">
          <div className="container-x">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="eyebrow text-gold mb-2">More to explore</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">You may also love</h2>
              </div>
              <Link to="/tours" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
                All tours ›
              </Link>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {related.map((t) => (
                <TourCard key={t.slug} tour={t} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <WhatsappFab />

      {/* Mobile sticky book bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-border shadow-[0_-8px_20px_rgba(30,58,95,0.08)] px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-body leading-none mb-1">From</p>
          <div className="flex items-baseline gap-2">
            <p className="font-display font-bold text-2xl text-gold leading-none">€{pricing.current}</p>
            {pricing.onSale && (
              <p className="text-sm text-body/60 line-through leading-none">€{pricing.original}</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex-1 max-w-[220px] bg-gold text-white py-3.5 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_6px_15px_rgba(43,182,247,0.35)]"
        >
          Check Availability →
        </button>
      </div>

      {/* Mobile booking sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="bg-white text-ink p-0 max-h-[92vh] overflow-y-auto rounded-t-2xl border-border">
          <SheetHeader className="px-5 pt-5 pb-2 text-left">
            <SheetTitle className="font-display text-xl text-ink">{tour.title}</SheetTitle>
          </SheetHeader>
          <div className="px-5 pb-8">
            <TourBookingPanel tour={tour} compact />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
