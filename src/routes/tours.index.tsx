import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import { useTours, tourCategories, tourPricing, type Tour } from "@/lib/cms";
import heroImg from "@/assets/hero-lisbon.jpg";

export const Route = createFileRoute("/tours/")({
  head: () => ({
    meta: [
      { title: "All Tours — Tuk Tuk 24 Private Tours of Portugal" },
      {
        name: "description",
        content:
          "Browse the full collection of private tuk-tuk, Sintra, Belém, Cascais and sunset experiences. Filter by category, sort by duration or price.",
      },
      { property: "og:title", content: "All Tours — Tuk Tuk 24" },
      {
        property: "og:description",
        content: "Private experiences across Portugal — never shared, never rushed.",
      },
      { property: "og:url", content: "/tours" },
    ],
    links: [{ rel: "canonical", href: "/tours" }],
  }),
  component: ToursPage,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "duration";

function ToursPage() {
  const { data: tours = [], isLoading } = useTours();
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);

  const filtered = useMemo(() => {
    const list = tours.filter((t) => {
      const okCat = cat === "all" || t.categorySlug === cat;
      const okQ =
        !q ||
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.category.toLowerCase().includes(q.toLowerCase()) ||
        t.tagline.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => tourPricing(a).current - tourPricing(b).current);
    else if (sort === "price-desc") sorted.sort((a, b) => tourPricing(b).current - tourPricing(a).current);
    else if (sort === "duration") sorted.sort((a, b) => a.duration.localeCompare(b.duration));
    else sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [tours, cat, q, sort]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: tours.length };
    for (const c of tourCategories) map[c.slug] = tours.filter((t) => t.categorySlug === c.slug).length;
    return map;
  }, [tours]);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      {/* PAGE HEADER */}
      <header className="relative pt-[78px] pb-12">
        <div className="relative h-[320px] md:h-[380px] overflow-hidden rounded-none">
          <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="container-x relative h-full flex flex-col justify-center text-white">
            <p className="eyebrow text-white/80 mb-3">◆  The Collection</p>
            <h1 className="font-display font-bold text-5xl md:text-6xl mb-3">All Tours</h1>
            <p className="text-white/85 max-w-xl">
              {tours.length} private experiences across Lisboa, Sintra, Belém, Cascais and beyond.
            </p>
          </div>
        </div>
      </header>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-[78px] z-30 bg-white border-b border-border shadow-[0_4px_15px_rgba(30,58,95,0.05)]">
        <div className="container-x py-4 flex flex-col gap-3">
          <div className="flex flex-row gap-2 items-center md:justify-between">
            <div className="relative flex-1 md:max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40"
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Alfama, Sintra…"
                className="w-full pl-10 pr-3 py-2.5 rounded-full bg-cloud border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="px-4 py-2.5 rounded-full bg-cloud border border-border text-sm text-ink focus:outline-none focus:border-gold cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>

          <div className="flex md:flex-wrap gap-2 overflow-x-auto -mx-5 px-5 md:mx-0 md:px-0 md:overflow-visible scrollbar-none">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")} count={counts.all}>
              All
            </FilterChip>
            {tourCategories.map((c) => (
              <FilterChip
                key={c.slug}
                active={cat === c.slug}
                onClick={() => setCat(c.slug)}
                count={counts[c.slug] ?? 0}
              >
                {c.title}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <section className="container-x py-12 md:py-16">
        <div className="flex items-baseline justify-between mb-8">
          <p className="text-sm text-body">
            Showing <span className="text-ink font-semibold">{filtered.length}</span> of {tours.length}
          </p>
          {(cat !== "all" || q) && (
            <button
              onClick={() => { setCat("all"); setQ(""); }}
              className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition"
            >
              Clear filters ×
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-border animate-pulse">
                <div className="aspect-[16/10] bg-cloud" />
                <div className="p-6 space-y-3">
                  <div className="h-3 w-24 bg-cloud rounded" />
                  <div className="h-5 w-3/4 bg-cloud rounded" />
                  <div className="h-3 w-full bg-cloud rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl bg-cloud/40">
            <p className="font-display text-2xl text-ink mb-3">Nothing here yet.</p>
            <p className="text-body text-sm mb-6">Try clearing the filters or searching differently.</p>
            <button
              onClick={() => { setCat("all"); setQ(""); }}
              className="px-6 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <TourGridCard key={t.slug} tour={t} onBook={() => setBookingTour(t)} />
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-cloud/60 py-20 md:py-24">
        <div className="container-x text-center max-w-3xl">
          <p className="eyebrow text-gold mb-3">Don't see your perfect day?</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4">
            We build private itineraries from scratch.
          </h2>
          <p className="text-body mb-8">
            Tell us your dates, your appetites, your pace — your concierge will design a day
            no two other guests have ever had.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center px-8 py-4 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.35)] transition-all"
          >
            Design a Custom Tour →
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsappFab />

      <BookingModal
        tour={bookingTour}
        open={!!bookingTour}
        onOpenChange={(v) => !v && setBookingTour(null)}
      />
    </div>
  );
}

function FilterChip({
  children, active, onClick, count,
}: {
  children: React.ReactNode; active: boolean; onClick: () => void; count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-widest transition-all border flex items-center gap-2 ${
        active
          ? "bg-gold text-white border-gold shadow-[0_6px_15px_rgba(43,182,247,0.3)]"
          : "bg-white border-border text-ink hover:border-gold hover:text-gold"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span className={`text-[10px] ${active ? "text-white/70" : "text-ink/40"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function TourGridCard({ tour, onBook }: { tour: Tour; onBook: () => void }) {
  return (
    <article className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] hover:-translate-y-1 transition-all duration-500 flex flex-col">
      <Link to="/tours/$slug" params={{ slug: tour.slug }} className="relative block aspect-[16/10] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {tour.featured && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            Signature
          </span>
        )}
        <span className="absolute top-3 right-3 bg-white/95 text-ink text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
          <span className="text-gold">★</span> 4.9
        </span>
      </Link>

      <div className="p-6 flex-1 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-2">{tour.category}</p>
        <h3 className="font-display font-semibold text-ink text-lg leading-snug mb-2 group-hover:text-gold transition-colors">
          <Link to="/tours/$slug" params={{ slug: tour.slug }}>{tour.title}</Link>
        </h3>
        <p className="text-sm text-body leading-relaxed mb-4 line-clamp-2 flex-1">
          {tour.description}
        </p>

        <div className="flex items-center gap-4 text-[11px] text-body mb-5 pb-5 border-b border-border">
          <span>⏱ {tour.duration}</span>
          <span>Private group</span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-body mb-1">From</p>
            <p className="font-display font-bold text-2xl text-gold leading-none">€{tour.priceFrom}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              className="px-4 py-2.5 rounded-full border border-border text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
            >
              Details
            </Link>
            <button
              type="button"
              onClick={onBook}
              className="px-5 py-2.5 rounded-full bg-gold text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_6px_15px_rgba(43,182,247,0.3)]"
            >
              Book →
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
