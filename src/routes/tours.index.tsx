import { trackWhatsappClick } from "@/lib/analytics";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import { useTours, tourCategories, tourPricing, type Tour } from "@/lib/cms";
import { useReviewStatsBySlug, useFeaturedReviews, type SlugStats } from "@/lib/reviews";
import { StarRating } from "@/components/site/StarRating";
import { useSiteBrand } from "@/lib/brand";
import { CANCELLATION_POLICY_BULLETS } from "@/lib/cancellation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-lisbon.jpg";

export const Route = createFileRoute("/tours/")({
  head: () => ({
    meta: [
      { title: "Private Lisbon Tuk-Tuk & Day Tours — Prices, Times, Pick-up" },
      {
        name: "description",
        content:
          "Every private tour we run in Lisbon, Sintra, Belém and Cascais — with real prices, durations, what's included, pick-up details and our cancellation policy.",
      },
      { property: "og:title", content: "Private Lisbon Tours — Tuk Tuk 24" },
      {
        property: "og:description",
        content:
          "Real prices, real durations, local drivers. Private groups only, hotel pick-up available.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://tuktuk24lisbon.com/tours" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/tours" }],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; date?: string; guests?: number; length?: string } => ({
    q: typeof search['q'] === 'string' && search['q'] ? String(search['q']) : undefined,
    date: typeof search['date'] === 'string' && search['date'] ? String(search['date']) : undefined,
    guests: Number(search['guests']) > 0 ? Number(search['guests']) : undefined,
    length: typeof search['length'] === 'string' && search['length'] ? String(search['length']) : undefined,
  }),
  component: ToursPage,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "duration";

type Faq = { id: string; question: string; answer: string };

function useFaqs(limit = 6) {
  return useQuery({
    queryKey: ["public-faqs", "tours", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs" as never)
        .select("id, question, answer, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Faq[];
    },
  });
}

function ToursPage() {
  const sp = Route.useSearch();
  const { data: tours = [], isLoading } = useTours();
  const { data: statsBySlug = {} } = useReviewStatsBySlug();
  const { data: guestReviews = [] } = useFeaturedReviews(3);
  const { data: faqs = [] } = useFaqs(6);
  const { business, hotelPickupFeeCents } = useSiteBrand();
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState(sp.q ?? "");
  const [sort, setSort] = useState<SortKey>("featured");
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);

  const pickupFee = Math.round((hotelPickupFeeCents ?? 0) / 100);

  const filtered = useMemo(() => {
    const list = tours.filter((t) => {
      const okCat = cat === "all" || t.categorySlug === cat;
      const okQ =
        !q ||
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.category.toLowerCase().includes(q.toLowerCase()) ||
        t.tagline.toLowerCase().includes(q.toLowerCase());
      const hours = sp.length ? (sp.length.match(/\d+/)?.[0] ?? "") : "";
      const okLen = !hours || t.duration.includes(hours);
      return okCat && okQ && okLen;
    });

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => tourPricing(a).current - tourPricing(b).current);
    else if (sort === "price-desc") sorted.sort((a, b) => tourPricing(b).current - tourPricing(a).current);
    else if (sort === "duration") sorted.sort((a, b) => a.duration.localeCompare(b.duration));
    else sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [tours, cat, q, sort, sp.length]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: tours.length };
    for (const c of tourCategories) map[c.slug] = tours.filter((t) => t.categorySlug === c.slug).length;
    return map;
  }, [tours]);

  const activeCategories = tourCategories.filter((c) => (counts[c.slug] ?? 0) > 0);

  const itemListLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Private tours by Tuk Tuk 24 in Lisbon",
      itemListElement: tours.map((t, i) => {
        const p = tourPricing(t);
        const s = statsBySlug[t.slug];
        return {
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "Product",
            name: t.title,
            url: `https://tuktuk24lisbon.com/tours/${t.slug}`,
            description: t.description,
            offers: {
              "@type": "Offer",
              price: p.current,
              priceCurrency: "EUR",
              availability: "https://schema.org/InStock",
            },
            ...(s && s.count > 0
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: Number(s.average.toFixed(1)),
                    reviewCount: s.count,
                  },
                }
              : {}),
          },
        };
      }),
    }),
    [tours, statsBySlug],
  );

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      {/* PAGE HEADER */}
      <header className="relative pt-[78px]">
        <div className="relative h-[300px] md:h-[360px] overflow-hidden">
          <img
            src={heroImg}
            alt="A Tuk Tuk 24 electric tuk-tuk on a cobbled Lisbon street"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-ink/60" />
          <div className="container-x relative h-full flex flex-col justify-center text-white">
            <p className="eyebrow text-white/80 mb-3">Lisbon · Sintra · Belém · Cascais</p>
            <h1 className="font-display font-bold text-white text-4xl md:text-6xl mb-4 leading-[1.05] max-w-3xl [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]">
              {tours.length > 0 ? `${tours.length} private tours` : "Private tours"}, driven by
              people who live here.
            </h1>
            <p className="text-white/85 max-w-xl text-sm md:text-base leading-relaxed">
              Every tour below is private — your group only. Prices are the full price for the
              vehicle, not per person, and we tell you the route before you pay.
            </p>
          </div>
        </div>

        {/* TRUST STRIP */}
        <div className="bg-ink text-white/85">
          <div className="container-x py-4 grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-[12px] md:text-[13px]">
            {[
              "Private groups only — never shared",
              `Hotel pick-up & drop-off · €${pickupFee}`,
              "Free cancellation up to 24h before",
              "Licensed local drivers · electric tuk-tuks",
            ].map((t) => (
              <div key={t} className="flex items-start gap-2">
                <span className="text-gold mt-[1px]">✓</span>
                <span>{t}</span>
              </div>
            ))}
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
                aria-label="Sort tours"
              >
                <option value="featured">Most booked</option>
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
            {activeCategories.map((c) => (
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
                  <div className="h-3 w-2/3 bg-cloud rounded" />
                  <div className="h-10 w-full bg-cloud rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-cloud/40 px-6">
            <p className="font-display text-2xl text-ink mb-2">No tour matches "{q || "that filter"}".</p>
            <p className="text-body text-sm mb-6">
              Try one of these instead, or tell us what you had in mind and we'll build the route.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-7">
              {activeCategories.slice(0, 5).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => { setCat(c.slug); setQ(""); }}
                  className="px-4 py-2 rounded-full bg-white border border-border text-[11px] font-semibold uppercase tracking-widest text-ink hover:border-gold hover:text-gold transition"
                >
                  {c.title} · {counts[c.slug]}
                </button>
              ))}
            </div>
            <Link
              to="/tours/custom"
              className="inline-block px-6 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition"
            >
              Build your own tour
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <TourGridCard
                key={t.slug}
                tour={t}
                stats={statsBySlug[t.slug]}
                onBook={() => setBookingTour(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* HOW A TOUR RUNS */}
      <section className="bg-white border-y border-border py-16 md:py-20">
        <div className="container-x">
          <p className="eyebrow text-gold mb-3">How a tour actually runs</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-10 max-w-2xl leading-tight">
            No queue, no meeting point hunt, no surprise extras.
          </h2>
          <ol className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                t: "The day before, we message you",
                d: "A WhatsApp with your driver's name, the pick-up time and where exactly they'll wait. If rain is coming, we say so and offer to move the day.",
              },
              {
                n: "02",
                t: "Your driver meets you at the door",
                d: "Hotel, apartment or a corner you pick — no hunting for a meeting point. Water on board, and a roof if the weather turns.",
              },
              {
                n: "03",
                t: "The route bends around you",
                d: "Want longer at a viewpoint, or to skip a stop for coffee in Alfama? Just say it. Extra time is charged only if you ask for it, at the rate on your booking.",
              },
            ].map((s) => (
              <li key={s.n} className="bg-cloud/50 border border-border rounded-2xl p-7">
                <p className="font-display text-4xl font-bold text-gold/70 mb-3">{s.n}</p>
                <h3 className="font-display text-xl font-semibold text-ink mb-2">{s.t}</h3>
                <p className="text-sm text-body leading-relaxed">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* GOOD TO KNOW */}
      <section className="container-x py-16 md:py-20 grid lg:grid-cols-2 gap-12">
        <div>
          <p className="eyebrow text-gold mb-3">Good to know</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-4 leading-tight">
            The practical stuff, before you book.
          </h2>
          <p className="text-body/80 mb-6">
            Want the full breakdown?{" "}
            <Link to="/tours/pricing-guide" className="text-gold font-semibold hover:underline">
              Read our guide to Lisbon tuk-tuk tour prices
            </Link>
            .
          </p>
          <dl className="divide-y divide-border border-y border-border">
            {[
              {
                q: "Pick-up & drop-off",
                a: `We collect you from your hotel or apartment anywhere in central Lisbon and drop you back. Door-to-door pick-up is €${pickupFee} per booking, added at checkout only if you choose it.`,
              },
              {
                q: "Rain",
                a: "Tuk-tuks have side covers and the premium ones have a roof. If the forecast is genuinely bad we'll message you the day before and you can move the date for free.",
              },
              {
                q: "Luggage",
                a: "Small bags and daypacks travel fine. Full suitcases only on the van and SUV — tell us in the notes and we'll send the right vehicle.",
              },
              {
                q: "Kids & accessibility",
                a: "Children are welcome; tell us their ages and we'll bring a booster. Tuk-tuks have a step up, so for limited mobility we recommend the SUV or van instead — just ask.",
              },
              {
                q: "Payment",
                a: "Card and the usual local methods at checkout. Prices are per person with a minimum of 2 guests — no hidden booking fee at the end.",
              },
              {
                q: "Languages",
                a: "Our drivers guide in English and Portuguese. Spanish and French are available on request if you book a few days ahead.",
              },
            ].map((r) => (
              <div key={r.q} className="py-4">
                <dt className="font-display font-semibold text-ink mb-1">{r.q}</dt>
                <dd className="text-sm text-body leading-relaxed">{r.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="space-y-8">
          <div className="bg-ink text-white rounded-2xl p-8">
            <p className="eyebrow text-gold mb-3">Cancellation policy</p>
            <h3 className="font-display text-2xl font-semibold mb-5">
              Plans change. Here's exactly where you stand.
            </h3>
            <ul className="space-y-3">
              {CANCELLATION_POLICY_BULLETS.map((b) => (
                <li key={b.text} className="flex gap-3 text-sm leading-relaxed">
                  <span className={b.ok ? "text-gold" : "text-white/40"}>{b.ok ? "✓" : "✕"}</span>
                  <span className="text-white/80">{b.text}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-cloud/60 border border-border rounded-2xl p-8">
            <p className="eyebrow text-gold mb-3">Not sure which tour?</p>
            <h3 className="font-display text-2xl font-semibold text-ink mb-3">
              Tell us your day and we'll shape the route.
            </h3>
            <p className="text-sm text-body leading-relaxed mb-6">
              Send how long you have, how many of you there are and what you're curious about.
              You'll get a route and a fixed price back — usually the same day.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/tours/custom"
                className="px-6 py-3 rounded-full bg-gold text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-ink transition"
              >
                Build your own tour
              </Link>
              <a
                href={`https://wa.me/${business.whatsappPhone.replace(/[^\d]/g, "")}`}
                onClick={() => trackWhatsappClick("tours_page")}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full border border-ink/20 text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* REAL REVIEWS */}
      {guestReviews.length > 0 && (
        <section className="bg-cloud/50 py-16 md:py-20 border-t border-border">
          <div className="container-x">
            <p className="eyebrow text-gold mb-3">From guests who rode with us</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-10">
              What people said afterwards.
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {guestReviews.map((r) => (
                <article key={r.id} className="bg-white border border-border rounded-2xl p-6 flex flex-col">
                  <StarRating value={r.rating} readOnly size={16} />
                  {r.title && (
                    <h3 className="font-display text-lg font-semibold text-ink mt-3">{r.title}</h3>
                  )}
                  <p className="text-sm text-body leading-relaxed mt-2 flex-1">
                    "{r.body.length > 220 ? r.body.slice(0, 220) + "…" : r.body}"
                  </p>
                  <p className="mt-5 pt-4 border-t border-border text-xs font-semibold text-ink">
                    {r.author_name}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container-x py-16 md:py-20">
          <p className="eyebrow text-gold mb-3">Questions we get a lot</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-8">
            Before you book.
          </h2>
          <div className="divide-y divide-border border-y border-border">
            {faqs.map((f) => (
              <details key={f.id} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-display text-lg font-semibold text-ink">
                  <span className="pr-6">{f.question}</span>
                  <span className="text-gold transition-transform group-open:rotate-45 shrink-0">+</span>
                </summary>
                <p className="text-sm text-body leading-relaxed mt-3 max-w-3xl">{f.answer}</p>
              </details>
            ))}
          </div>
          <Link
            to="/faq"
            className="inline-block mt-8 text-[11px] font-semibold uppercase tracking-widest text-gold border-b-2 border-gold pb-1 hover:text-ink hover:border-ink transition"
          >
            Read all frequently asked questions
          </Link>
        </section>
      )}

      <Footer />
      <WhatsappFab />

      <BookingModal
        defaultDate={sp.date}
        defaultGuests={sp.guests}
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

function TourGridCard({
  tour, stats, onBook,
}: {
  tour: Tour; stats?: SlugStats; onBook: () => void;
}) {
  const pricing = tourPricing(tour);
  const included = (tour.included ?? []).slice(0, 3);

  return (
    <article className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] hover:-translate-y-1 transition-all duration-500 flex flex-col">
      <Link to="/tours/$slug" params={{ slug: tour.slug }} className="relative block aspect-[16/10] overflow-hidden">
        <img
          src={tour.image}
          alt={`${tour.title} — private tour in ${tour.category}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        {tour.featured && (
          <span className="absolute top-3 left-3 bg-ink/85 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            Most booked
          </span>
        )}
        {pricing.onSale && (
          <span className={`absolute left-3 ${tour.featured ? "top-10" : "top-3"} bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md`}>
            −{pricing.discountPct}% Sale
          </span>
        )}
        {stats && stats.count > 0 && (
          <span className="absolute top-3 right-3 bg-white/95 text-ink text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <span className="text-gold">★</span> {stats.average.toFixed(1)}
            <span className="text-ink/50 font-normal">({stats.count})</span>
          </span>
        )}
      </Link>

      <div className="p-6 flex-1 flex flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-2">{tour.category}</p>
        <h3 className="font-display font-semibold text-ink text-lg leading-snug mb-2 group-hover:text-gold transition-colors">
          <Link to="/tours/$slug" params={{ slug: tour.slug }}>{tour.title}</Link>
        </h3>
        <p className="text-sm text-body leading-relaxed mb-4 line-clamp-2">
          {tour.description}
        </p>

        <ul className="space-y-1.5 mb-4 flex-1">
          <li className="flex gap-2 text-[12px] text-body">
            <span className="text-gold">·</span> {tour.duration} · private tour, minimum 2 guests
          </li>
          {included.map((i) => (
            <li key={i} className="flex gap-2 text-[12px] text-body">
              <span className="text-gold">·</span> {i}
            </li>
          ))}
          <li className="flex gap-2 text-[12px] text-body">
            <span className="text-gold">·</span> English & Portuguese guide · instant confirmation
          </li>
        </ul>

        <div className="flex items-end justify-between pt-5 border-t border-border">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-body mb-1">Price per person</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-display font-bold text-2xl text-gold leading-none">€{pricing.current}</p>
              {pricing.onSale && (
                <p className="text-sm text-body/60 line-through leading-none">€{pricing.original}</p>
              )}
            </div>
            <p className="text-[11px] text-body mt-1">per person · minimum 2 guests</p>
            <p className="text-[10px] text-body/70 mt-1">Free cancellation up to 24h before</p>
          </div>
          <div className="flex gap-2 shrink-0">
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
