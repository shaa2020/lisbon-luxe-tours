import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tours, categories } from "@/data/tours";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import type { Tour } from "@/data/tours";
import heroImg from "@/assets/hero-lisbon.jpg";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "The Collection — Private Tours of Lisboa, Sintra & Cascais" },
      {
        name: "description",
        content:
          "Browse our full collection of private tuk-tuk, Sintra, Belém, Cascais and sunset experiences. Filter by category, sort by duration or price.",
      },
      { property: "og:title", content: "The Collection — Lusitano Private Tours" },
      {
        property: "og:description",
        content: "Curated private experiences across Portugal — never shared, never rushed.",
      },
      { property: "og:url", content: "/tours" },
    ],
    links: [{ rel: "canonical", href: "/tours" }],
  }),
  component: ToursPage,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "duration";

function ToursPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

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
    if (sort === "price-asc") sorted.sort((a, b) => a.priceFrom - b.priceFrom);
    else if (sort === "price-desc") sorted.sort((a, b) => b.priceFrom - a.priceFrom);
    else if (sort === "duration") sorted.sort((a, b) => a.duration.localeCompare(b.duration));
    else sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [cat, q, sort]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: tours.length };
    for (const c of categories) map[c.slug] = tours.filter((t) => t.categorySlug === c.slug).length;
    return map;
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0b09] text-white selection:bg-gold/30">
      <Nav overlay />

      {/* HERO */}
      <header className="relative pt-44 pb-20 md:pt-56 md:pb-28 px-6 md:px-10 overflow-hidden">
        <img
          src={heroImg}
          alt="Lisboa at golden hour"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-[#0b0b09]" />

        <div className="relative max-w-7xl mx-auto">
          <p className="eyebrow text-gold mb-5 animate-[fade-up_0.9s_var(--ease-out-expo)_both]">The Collection · {tours.length} experiences</p>
          <h1
            className="font-serif italic leading-[0.88] tracking-[-0.03em] text-white mb-6 max-w-5xl animate-[fade-up_1s_var(--ease-out-expo)_0.1s_both]"
            style={{ fontSize: "clamp(48px, 9vw, 140px)" }}
          >
            Every tour, <span className="text-gold">privately yours.</span>
          </h1>
          <p className="max-w-2xl text-white/65 leading-relaxed text-lg animate-[fade-up_1s_var(--ease-out-expo)_0.2s_both]">
            Each experience is operated for one party at a time — never shared, never rushed.
            Filter by region, sort by price, or simply scroll until something stirs you.
          </p>
        </div>
      </header>

      {/* STICKY FILTER BAR */}
      <div className="sticky top-20 z-30 bg-[#0b0b09]/90 backdrop-blur-xl border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex flex-col gap-4">
          {/* Search + sort row */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
                <path d="m20 20-3-3" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Alfama, Sintra, sunset…"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="eyebrow text-white/50 hidden md:block">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="px-4 py-3 rounded-full bg-white/5 border border-white/15 text-sm text-white focus:outline-none focus:border-gold cursor-pointer"
              >
                <option value="featured" className="bg-[#0b0b09]">Featured</option>
                <option value="price-asc" className="bg-[#0b0b09]">Price · low to high</option>
                <option value="price-desc" className="bg-[#0b0b09]">Price · high to low</option>
                <option value="duration" className="bg-[#0b0b09]">Duration</option>
              </select>
            </div>
          </div>

          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")} count={counts.all}>
              All
            </FilterChip>
            {categories.map((c) => (
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
      <section className="px-6 md:px-10 max-w-7xl mx-auto py-14 md:py-20">
        <div className="flex items-baseline justify-between mb-10">
          <p className="eyebrow text-white/50">
            Showing <span className="text-gold">{filtered.length}</span> of {tours.length}
          </p>
          {(cat !== "all" || q) && (
            <button
              onClick={() => { setCat("all"); setQ(""); }}
              className="eyebrow text-white/60 hover:text-gold transition-colors"
            >
              Clear filters ×
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-32 border border-dashed border-white/15 rounded-2xl">
            <p className="font-serif italic text-3xl text-white/70 mb-3">Nothing here yet.</p>
            <p className="text-white/50 text-sm mb-6">Try clearing the filters or searching differently.</p>
            <button
              onClick={() => { setCat("all"); setQ(""); }}
              className="eyebrow px-6 py-3 rounded-full border border-white/20 hover:bg-gold hover:text-ink hover:border-gold transition"
            >
              Reset
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <PremiumTourCard key={t.slug} tour={t} />
            ))}
          </div>
        )}
      </section>

      {/* CTA strip */}
      <section className="px-6 md:px-10 py-20 md:py-28 border-t border-white/10 bg-black/40">
        <div className="max-w-5xl mx-auto text-center">
          <p className="eyebrow text-gold mb-5">Don't see your perfect day?</p>
          <h2 className="font-serif text-4xl md:text-6xl italic text-white leading-[0.95] mb-6">
            We build private itineraries from scratch.
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-10">
            Tell us your dates, your appetites, your pace — your concierge will design
            a day no two other guests have ever had.
          </p>
          <Link
            to="/contact"
            className="inline-block px-10 py-5 rounded-full bg-gold text-ink eyebrow font-medium hover:bg-white transition-colors"
          >
            Design a Custom Tour →
          </Link>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
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
      className={`px-4 py-2 rounded-full eyebrow font-medium transition-all border flex items-center gap-2 ${
        active
          ? "bg-gold text-ink border-gold"
          : "bg-white/5 border-white/15 text-white/70 hover:border-gold/50 hover:text-white"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" && (
        <span className={`text-[9px] tracking-normal ${active ? "text-ink/60" : "text-white/40"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function PremiumTourCard({ tour }: { tour: typeof tours[number] }) {
  return (
    <article className="group relative flex flex-col rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-gold/40 transition-all duration-500 hover:-translate-y-1">
      {/* Image */}
      <Link
        to="/tours/$slug"
        params={{ slug: tour.slug }}
        className="relative block aspect-[4/3] overflow-hidden"
      >
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.2s]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {/* Top tags */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <span className="eyebrow bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full border border-white/15">
            {tour.tagline}
          </span>
          {tour.featured && (
            <span className="eyebrow bg-gold text-ink px-3 py-1.5 rounded-full">
              Signature
            </span>
          )}
        </div>

        {/* Bottom meta */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end text-white text-[11px]">
          <span className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth="1.5"/>
              <path d="M12 7v5l3 2" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {tour.duration}
          </span>
          <span className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-gold">★</span> 4.9
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-col flex-1 p-6">
        <p className="eyebrow text-gold/80 mb-3">{tour.category}</p>
        <h3 className="font-serif text-2xl md:text-[26px] italic text-white leading-tight mb-3">
          {tour.title}
        </h3>
        <p className="text-sm text-white/55 leading-relaxed mb-5 line-clamp-2 flex-1">
          {tour.description}
        </p>

        {/* Highlight tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {tour.highlights.slice(0, 3).map((h) => (
            <span
              key={h}
              className="text-[10px] tracking-wide text-white/55 border border-white/10 rounded-full px-2.5 py-1"
            >
              {h}
            </span>
          ))}
        </div>

        {/* Price + actions */}
        <div className="flex items-end justify-between pt-5 border-t border-white/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">From</p>
            <p className="font-serif text-3xl text-gold leading-none">€{tour.priceFrom}</p>
            <p className="text-[10px] text-white/40 mt-1">per group · private</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              className="eyebrow px-4 py-2.5 rounded-full border border-white/20 text-white/80 hover:border-white/50 transition"
            >
              Details
            </Link>
            <Link
              to="/tours/$slug"
              params={{ slug: tour.slug }}
              className="eyebrow px-5 py-2.5 rounded-full bg-gold text-ink hover:bg-white transition flex items-center gap-1.5"
            >
              Book →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
