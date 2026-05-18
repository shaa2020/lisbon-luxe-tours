import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { TourCard } from "@/components/site/TourCard";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import { useTour, useTours } from "@/lib/cms";

export const Route = createFileRoute("/tours/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Tour — Luz de Private Tours` },
      { property: "og:url", content: `/tours/${params.slug}` },
      { property: "og:type", content: "product" },
    ],
    links: [{ rel: "canonical", href: `/tours/${params.slug}` }],
  }),
  component: TourPage,
});

function TourPage() {
  const { slug } = Route.useParams();
  const { data: tour, isLoading, isError, error } = useTour(slug);
  const { data: allTours = [] } = useTours();
  const [bookingOpen, setBookingOpen] = useState(false);

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
              <span className="flex items-center gap-1.5"><span className="text-gold">★★★★★</span> 4.9 (124 reviews)</span>
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
        </div>

        {/* Sticky booking card */}
        <aside className="lg:sticky lg:top-28 h-fit">
          <div className="bg-white rounded-2xl border border-border shadow-[0_20px_50px_rgba(30,58,95,0.10)] p-7">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-body">From</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-body">per group</p>
            </div>
            <p className="font-display font-bold text-5xl text-gold leading-none mb-2">€{tour.priceFrom}</p>
            <p className="text-body text-sm mb-6">Private · {tour.duration} · Up to 7 guests</p>

            <button
              onClick={() => setBookingOpen(true)}
              className="w-full bg-gold text-white py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_8px_20px_rgba(43,182,247,0.35)] mb-3"
            >
              Check Availability →
            </button>
            <a
              href="https://wa.me/351912345678"
              className="w-full block text-center border border-border text-ink py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
            >
              WhatsApp Concierge
            </a>

            <ul className="mt-6 pt-6 border-t border-border space-y-2.5 text-[13px] text-body">
              <li className="flex gap-2"><span className="text-gold">✓</span> Free cancellation up to 24h</li>
              <li className="flex gap-2"><span className="text-gold">✓</span> Reserve now, pay later</li>
              <li className="flex gap-2"><span className="text-gold">✓</span> Hotel pick-up included</li>
              <li className="flex gap-2"><span className="text-gold">✓</span> Concierge replies in &lt;4h</li>
            </ul>
          </div>
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
          <p className="font-display font-bold text-2xl text-gold leading-none">€{tour.priceFrom}</p>
        </div>
        <button
          onClick={() => setBookingOpen(true)}
          className="flex-1 max-w-[220px] bg-gold text-white py-3.5 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_6px_15px_rgba(43,182,247,0.35)]"
        >
          Book Now →
        </button>
      </div>

      <BookingModal
        tour={bookingOpen ? tour : null}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </div>
  );
}
