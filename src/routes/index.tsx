import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab, WhatsappInline } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import { TestimonialsSection } from "@/components/site/TestimonialsSection";
import { TrustStrip } from "@/components/site/TrustStrip";
import { StickyBookBar } from "@/components/site/StickyBookBar";
import { mapPost, tourPricing, toursQueryOptions, type BlogPost, type Tour } from "@/lib/cms";
import { MediaImage } from "@/components/site/MediaImage";
import { HeroSlideshow, useSlideRotation } from "@/components/site/HeroSlideshow";

import { trackBookingCtaClick } from "@/lib/analytics";
import { subscribeToNewsletter } from "@/lib/subscribers.functions";
import { useSiteBrand, mapSiteBrand, SITE_BRAND_KEY, SiteBrandProvider } from "@/lib/brand";
import { useReviewSummary } from "@/lib/reviews";
import { StarRating } from "@/components/site/StarRating";
import { getPublicSiteSettings, getPublishedBlogPosts } from "@/lib/cms.functions";

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    const [brand, tours, blogPosts] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: SITE_BRAND_KEY,
        staleTime: 5 * 60_000,
        queryFn: async () => mapSiteBrand(await getPublicSiteSettings()),
      }),
      context.queryClient.ensureQueryData(toursQueryOptions),
      (async (): Promise<BlogPost[]> =>
        ((await getPublishedBlogPosts()) ?? []).map((r) => mapPost(r as never)))(),
    ]);
    const prices = tours.map((t) => tourPricing(t).current).filter((n) => n > 0);
    const fromPrice = prices.length ? Math.min(...prices) : null;
    return { brand, fromPrice, tours, blogPosts };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: "Private Tuk-Tuk Tours in Lisbon — Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Private tuk-tuk tours around Lisbon with local drivers. Alfama, Belém, Sintra, sunset rides — small groups, flat prices, easy booking.",
      },
      { property: "og:title", content: "Private Tuk-Tuk Tours in Lisbon — Tuk Tuk 24" },
      {
        property: "og:description",
        content:
          "Ride through Alfama, Belém and Sintra with a local driver. Small groups, per-person prices, book in minutes.",
      },
      { name: "twitter:title", content: "Private Tuk-Tuk Tours in Lisbon — Tuk Tuk 24" },
      {
        name: "twitter:description",
        content:
          "Ride through Alfama, Belém and Sintra with a local driver. Small groups, per-person prices, book in minutes.",
      },
      { property: "og:url", content: "https://tuktuk24lisbon.com/" },
    ],
    links: (() => {
      const heroImage =
        loaderData?.brand?.heroSlides?.[0]?.image_url ?? loaderData?.brand?.heroImageUrl ?? null;
      return [
        { rel: "canonical", href: "https://tuktuk24lisbon.com/" },
        ...(heroImage
          ? [{ rel: "preload", as: "image", href: heroImage, fetchPriority: "high" }]
          : []),
      ];
    })(),
  }),
  component: Index,
});

function Index() {
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  const { brand } = Route.useLoaderData();
  return (
    <SiteBrandProvider brand={brand}>
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav overlay />
      <Hero />
      <TrustStrip />
      <TestimonialsSection />
      <PopularTours onBook={setBookingTour} />
      <WhyTravel />
      <Destinations />
      <AboutSection />
      <Gallery />
      <TravelTipsAndSignup />
      <Footer />
      <WhatsappFab />
      <StickyBookBar />

      <BookingModal
        tour={bookingTour}
        open={!!bookingTour}
        onOpenChange={(v) => !v && setBookingTour(null)}
      />
    </div>
    </SiteBrandProvider>
  );
}

/* ============================== HERO ============================== */

function Hero() {
  const { heroImageUrl, heroSlides, isPlaceholderData, isPending } = useSiteBrand();
  const settingsReady = !isPending && !isPlaceholderData;
  const slides = heroSlides.length
    ? heroSlides.map((slide) => ({ ...slide, image_url: slide.image_url ?? heroImageUrl }))
    : [{ label: "Lisbon", image_url: heroImageUrl }];
  const usableSlides = slides.filter((s) => !!s.image_url);
  const [activeSlide] = useSlideRotation(usableSlides.length);
  const currentSlide = usableSlides[activeSlide] ?? slides[0];
  const { fromPrice } = Route.useLoaderData();
  const { data: reviewSummary } = useReviewSummary();

  return (
    <section className="relative">
      <div className="relative min-h-[520px] sm:min-h-[560px] md:h-[760px] overflow-hidden bg-ink">
        {settingsReady && <HeroSlideshow slides={usableSlides} activeIndex={activeSlide} />}

        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/30 to-ink/70" />

        {/* Centered headline */}
        <div className="relative md:h-full container-x flex flex-col items-center justify-center text-center pt-[110px] md:pt-[110px] pb-14 md:pb-32">
          <h1 className="flex flex-col items-center">
            <span
              className="text-white text-3xl sm:text-4xl md:text-6xl -mb-3 sm:-mb-5 md:-mb-8 font-normal"
              style={{ fontFamily: '"Yellowtail", cursive' }}
            >
              Explore Beautiful
            </span>
            <span
              key={currentSlide?.label || "Lisbon"}
              className="block font-sans font-bold uppercase text-white leading-[0.92] tracking-tight animate-[fade-up_0.8s_var(--ease-out-expo)_both]"
              style={{ fontSize: "clamp(40px, 11vw, 170px)" }}
            >
              {currentSlide?.label || "Lisbon"}
            </span>

            <span className="mt-2 text-white/90 text-[13px] md:text-[15px] uppercase tracking-[0.28em]">
              Private Tuk-Tuk Tours in Lisbon
            </span>
          </h1>

          <p className="mt-4 md:mt-5 max-w-xl text-white/85 text-[14px] md:text-[16px] leading-relaxed px-4">
            Private tuk-tuk tours with local drivers. Small groups, flat prices, your pace.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            <Link
              to="/tours"
              onClick={() => trackBookingCtaClick("home_hero")}
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_10px_26px_rgba(43,182,247,0.4)] hover:bg-white hover:text-ink transition-colors"
            >
              Book a tour →
            </Link>
            <WhatsappInline
              location="home_hero"
              message="Hi Tuk Tuk 24! I'd like to book a private tuk-tuk tour in Lisbon."
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-[#25D366]/20 transition-colors"
            >
              WhatsApp us
            </WhatsappInline>
          </div>

          {reviewSummary && reviewSummary.count > 0 && (
            <Link
              to="/reviews"
              className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/10 backdrop-blur px-4 py-2 hover:bg-white/20 transition-colors"
            >
              <StarRating value={reviewSummary.average} readOnly size={13} />
              <span className="text-[12px] text-white font-medium">
                {reviewSummary.average.toFixed(1)} · {reviewSummary.count} verified review
                {reviewSummary.count === 1 ? "" : "s"}
              </span>
            </Link>
          )}

          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-[12px] text-white/80 px-4">
            {[
              fromPrice ? `From €${fromPrice} per person` : "Private groups only",
              "Free cancellation up to 24h",
              "Instant confirmation",
              "Licensed local drivers",
            ].map((b) => (
              <li key={b} className="flex items-center gap-1.5">
                <span className="text-gold">✓</span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        {/* Search bar — inside hero on desktop, hidden on mobile (shown below hero) */}
        <div className="hidden md:block absolute inset-x-0 bottom-8">
          <div className="container-x">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Mobile search bar sits below the hero so nothing overlaps */}
      <div className="md:hidden container-x -mt-8 relative z-10">
        <SearchBar />
      </div>
    </section>
  );
}

function SearchBar() {
  const navigate = useNavigate();
  const [dest, setDest] = useState("");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState("");
  const [length, setLength] = useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    navigate({
      to: "/tours",
      search: {
        q: dest.trim() || undefined,
        date: date || undefined,
        guests: guests ? Number(guests) : undefined,
        length: length.trim() || undefined,
      },
    });
  };

  return (
    <div
      role="search"
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
      }}
      className="bg-white shadow-[0_24px_60px_rgba(10,20,35,0.28)] grid grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] overflow-hidden"
    >
      <SearchField label="Destination" placeholder="Alfama, Sintra, Belém…" value={dest} onChange={setDest}>
        <PinIco />
      </SearchField>
      <SearchField label="Date" placeholder="dd / mm / yy" type="date" value={date} onChange={setDate}>
        <CalIco />
      </SearchField>
      <SearchField label="Guests" placeholder="2" type="number" value={guests} onChange={setGuests}>
        <UserIco />
      </SearchField>
      <SearchField label="Tour length" placeholder="2 hours" value={length} onChange={setLength}>
        <CalIco />
      </SearchField>
      <button
        type="button"
        onClick={() => submit()}
        className="col-span-2 lg:col-span-1 h-[56px] md:h-[68px] px-8 bg-gold text-white font-semibold text-[13px] tracking-widest uppercase hover:bg-ink transition-colors flex items-center justify-center gap-2"
      >
        <SearchIco />
        Search
      </button>
    </div>
  );
}

function SearchIco() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function SearchField({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  children,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 h-[56px] md:h-[68px] px-4 md:px-5 border-b border-r border-border lg:border-b-0 [&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r min-w-0">
      <span className="text-gold shrink-0">{children}</span>
      <span className="flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-semibold text-ink/50 uppercase tracking-widest">
          {label}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={type === "number" ? 1 : undefined}
          className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink/40 outline-none min-w-0"
        />
      </span>
    </label>
  );
}

/* ============================== ABOUT ============================== */

function AboutSection() {
  const facts = [
    { k: "Group size", v: "Private only — max 6 per tuk-tuk" },
    { k: "Languages", v: "English · Portuguese · Spanish" },
    { k: "Hotel pickup", v: "€20 anywhere in central Lisbon" },
    { k: "Cancellation", v: "Free up to 24h before the tour" },
  ];

  const steps = [
    { n: "01", t: "Pick a route", d: "Choose a tour or build your own — hills, food, viewpoints, you decide." },
    { n: "02", t: "Confirm the details", d: "Date, time, group size and pickup point. Pay online, no deposit games." },
    { n: "03", t: "Meet your driver", d: "A licensed Lisboeta guide, an electric tuk-tuk, and the whole city ahead." },
  ];

  return (
    <section className="bg-white border-y border-ink/10">
      <div className="container-x py-14 md:py-16">
        <div className="grid lg:grid-cols-3 gap-10 lg:gap-14 items-start">
          {steps.map((s) => (
            <div key={s.n}>
              <span className="font-display text-xl text-gold">{s.n}</span>
              <h3 className="font-display text-lg font-bold text-ink mt-1 mb-1.5">{s.t}</h3>
              <p className="text-[14px] text-body leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 items-start">
          <div>
            <p className="eyebrow text-gold mb-3">About us</p>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-ink leading-tight mb-4">
              A small tuk-tuk crew, born and raised in Lisbon.
            </h2>
            <p className="text-body leading-relaxed text-[15px] mb-6">
              Family-run drivers and guides from Lisbon. No coach buses, no scripted headsets — just
              our tuk-tuks and the neighbourhoods we grew up in. Tell us what you like and we build
              the route around it.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/tours"
                onClick={() => trackBookingCtaClick("home_about")}
                className="inline-flex items-center px-7 py-3.5 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition-all"
              >
                See our tours
              </Link>
              <Link
                to="/about"
                className="inline-flex items-center px-7 py-3.5 rounded-full border border-ink/15 text-ink text-[12px] font-semibold uppercase tracking-widest hover:border-ink/40 transition-all"
              >
                More about us
              </Link>
            </div>
          </div>

          <dl className="divide-y divide-ink/10 border-y border-ink/10">
            {facts.map((f) => (
              <div key={f.k} className="flex items-baseline justify-between gap-6 py-3">
                <dt className="text-[11px] uppercase tracking-widest text-body/70 shrink-0">{f.k}</dt>
                <dd className="text-[14px] text-ink text-right">{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}



/* ============================== (flash deals merged into Popular tours) ============================== */



/* ============================== WHY TRAVEL ============================== */

function WhyTravel() {
  const features = [
    {
      title: "Small & private",
      body: "You book, your group rides — no strangers, no shared vans. Just you, us, and the city.",
      icon: <ShieldIco />,
    },
    {
      title: "Real Lisboetas",
      body: "Our guides grew up here. They'll take you past the queues and into the streets they actually live on.",
      icon: <BadgeIco />,
    },
    {
      title: "One flat price",
      body: "The price you see is the price you pay. No commission games, no upsells at the end of the ride.",
      icon: <CoinIco />,
    },
  ];
  return (
    <section className="container-x py-12 md:py-16">
      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        {features.map((f) => (
          <div key={f.title} className="flex gap-4 items-start">
            <div className="w-12 h-12 shrink-0 rounded-full bg-white border border-gold/25 flex items-center justify-center text-gold [&_svg]:w-6 [&_svg]:h-6">
              {f.icon}
            </div>
            <div>
              <h3 className="font-display text-[17px] font-semibold text-ink mb-1">{f.title}</h3>
              <p className="text-body text-[13px] leading-relaxed">{f.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}


/* ============================== POPULAR TOURS ============================== */

function PopularTours({ onBook }: { onBook: (t: Tour) => void }) {
  const { tours } = Route.useLoaderData();
  const { offerBar } = useSiteBrand();

  return (
    <section className="bg-cloud/60 py-14 md:py-20">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
              Our most-booked tours
            </h2>
            <p className="text-body text-sm">
              Private groups, per-person prices, free cancellation up to 24h before.
            </p>
          </div>
          <Link to="/tours" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
            View All ›
          </Link>
        </div>

        {offerBar.enabled && offerBar.code && (
          <div className="mb-8 rounded-xl border border-gold/30 bg-white px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <span className="text-ink font-semibold">Book direct and save</span>
            <span className="text-body">use code</span>
            <span className="font-mono tracking-widest text-gold border border-gold/40 rounded-[2px] px-2 py-0.5">
              {offerBar.code}
            </span>
            <span className="text-body">at checkout.</span>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tours.slice(0, 6).map((t) => (
            <PopularCard key={t.slug} tour={t} onBook={() => onBook(t)} />
          ))}
        </div>
      </div>
    </section>
  );
}


function PopularCard({ tour, onBook }: { tour: Tour; onBook: () => void }) {
  const pricing = tourPricing(tour);
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] transition-all duration-500 group">
      <Link to="/tours/$slug" params={{ slug: tour.slug }} className="relative block aspect-[16/10] overflow-hidden">
        <MediaImage src={tour.image} alt={tour.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        {tour.featured && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            Top Rated
          </span>
        )}
        {pricing.onSale && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md">
            −{pricing.discountPct}% Sale
          </span>
        )}
      </Link>
      <div className="p-6">
        <h3 className="font-display font-semibold text-ink text-[16px] leading-snug mb-2 hover:text-gold transition-colors">
          <Link to="/tours/$slug" params={{ slug: tour.slug }}>{tour.title}</Link>
        </h3>
        <p className="text-[11px] text-body/70 mb-4">Private group · English & Portuguese</p>
        <div className="flex items-center gap-4 text-[11px] text-body mb-5 pb-5 border-b border-border">
          <span className="flex items-center gap-1.5"><PinIco /> {tour.category || "Lisboa"}</span>
          <span className="flex items-center gap-1.5"><ClockIco /> {tour.duration}</span>
          <span className="flex items-center gap-1.5"><UserIco /> Private · max 6</span>

        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-body uppercase tracking-widest">From </span>
            <span className="text-gold font-display font-bold text-2xl">€{pricing.current}</span>
            {pricing.onSale && (
              <span className="ml-2 text-sm text-body/60 line-through">€{pricing.original}</span>
            )}
            <span className="block text-[11px] text-body">per person · minimum 2 guests</span>
          </div>
          <button
            type="button"
            onClick={onBook}
            className="px-5 py-2.5 rounded-full bg-gold text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_6px_15px_rgba(43,182,247,0.3)]"
          >
            Book now
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================== DESTINATIONS ============================== */

function Destinations() {
  const { tours } = Route.useLoaderData();
  // Destination imagery is taken from the live tour catalogue so it always
  // reflects what admins uploaded — never a bundled/stale photo.
  const byCategory = (needle: string) =>
    tours.find(
      (t) =>
        t.categorySlug?.toLowerCase().includes(needle) ||
        t.category?.toLowerCase().includes(needle) ||
        t.slug?.toLowerCase().includes(needle),
    )?.image || null;
  const anyImg = (i: number) => tours[i % (tours.length || 1)]?.image || null;
  const dests = [
    { name: "Lisboa", count: 12, img: byCategory("lisbo") ?? anyImg(0) },
    { name: "Sintra", count: 6, img: byCategory("sintra") ?? anyImg(1) },
    { name: "Belém", count: 4, img: byCategory("belem") ?? anyImg(2) },
    { name: "Cascais", count: 5, img: byCategory("cascais") ?? anyImg(3) },
    { name: "Cabo da Roca", count: 3, img: byCategory("roca") ?? anyImg(4) },
    { name: "Alfama", count: 8, img: byCategory("alfama") ?? anyImg(5) },
  ];
  const [active, setActive] = useState(2);

  return (
    <section className="container-x py-20 md:py-28">
      <div className="text-center mb-14">
        <p className="eyebrow text-gold mb-3">Where we go</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
          Pick a neighborhood, we'll drive.
        </h2>
      </div>

      <div className="relative">
        <div className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-none -mx-5 px-5">
          {dests.map((d, i) => (
            <button
              key={d.name}
              onClick={() => setActive(i)}
              className={`relative shrink-0 snap-center rounded-2xl overflow-hidden transition-all duration-500 ${
                active === i
                  ? "w-[280px] h-[380px] shadow-[0_20px_50px_rgba(30,58,95,0.25)]"
                  : "w-[200px] h-[320px] mt-8 opacity-90 hover:opacity-100"
              }`}
            >
              <MediaImage src={d.img} alt={d.name} wrapperClassName="w-full h-full" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-left text-white">
                <div className="flex items-center gap-2 mb-1">
                  <PinIco />
                  <span className="font-display font-semibold text-lg">{d.name}</span>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-white/80">
                  {d.count} Tours
                </p>
                {active === i && (
                  <Link
                    to="/tours"
                    className="inline-flex mt-3 items-center gap-1 text-[11px] font-semibold uppercase tracking-widest bg-gold px-3 py-1.5 rounded-sm hover:bg-white hover:text-gold transition"
                  >
                    View All Tours
                  </Link>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== GALLERY ============================== */

function Gallery() {
  const { tours } = Route.useLoaderData();
  const pool = tours.map((t) => t.image).filter(Boolean);
  const imgs = Array.from({ length: 12 }, (_, i) => (pool.length ? pool[i % pool.length] : null));
  return (
    <section className="bg-cloud/40 py-20 md:py-24">
      <div className="container-x">
        <div className="text-center mb-12">
          <p className="eyebrow text-gold mb-3">From the tuk-tuk</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
            Snapshots from recent rides.
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {imgs.map((src, i) => (
            <div
              key={i}
              className={`relative group overflow-hidden rounded-lg ${
                i === 2 || i === 7 ? "md:row-span-2 md:col-span-2 aspect-square md:aspect-auto" : "aspect-square"
              }`}
            >
              <MediaImage
                src={src}
                alt=""
                wrapperClassName="w-full h-full"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/20 transition-colors flex items-center justify-center">
                <svg
                  className="opacity-0 group-hover:opacity-100 transition w-8 h-8 text-white"
                  fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3-3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================== TRAVEL TIPS + SIGNUP ============================== */

function TravelTipsAndSignup() {
  const { blogPosts } = Route.useLoaderData();
  const tips = blogPosts.slice(0, 2);
  return (
    <section className="container-x py-20 md:py-28">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
            From our journal
          </h2>
          <p className="text-body text-sm">Notes and tips from around the city.</p>
        </div>
        <Link to="/journal" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
          View All ›
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tips.map((t) => (
          <article key={t.slug} className="bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] transition-shadow group">
            <Link to="/journal/$slug" params={{ slug: t.slug }} className="block aspect-[16/10] overflow-hidden">
              <MediaImage src={t.image} alt={t.title} wrapperClassName="w-full h-full" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </Link>
            <div className="p-6">
              <div className="flex gap-4 text-[11px] text-body mb-3">
                <span className="flex items-center gap-1.5"><CalIco /> {t.date}</span>
                <span className="flex items-center gap-1.5"><ChatIco /> {t.comments} Comments</span>
                <span className="flex items-center gap-1.5"><ShareIco /> {t.shares} Shares</span>
              </div>
              <h3 className="font-display font-semibold text-ink text-lg leading-snug mb-3 hover:text-gold transition-colors">
                <Link to="/journal/$slug" params={{ slug: t.slug }}>
                  {t.title}
                </Link>
              </h3>
              <p className="text-body text-sm leading-relaxed mb-5 line-clamp-2">{t.excerpt}</p>
              <Link to="/journal/$slug" params={{ slug: t.slug }} className="inline-block text-[11px] font-semibold uppercase tracking-widest text-gold border-b-2 border-gold pb-1 hover:text-ink hover:border-ink transition">
                Read the full story
              </Link>
            </div>
          </article>
        ))}

        {/* Signup card */}
        <SignupCard />
      </div>
    </section>
  );
}

function SignupCard() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const subscribe = useServerFn(subscribeToNewsletter);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await subscribe({ data: { email: email.trim() } });
      toast.success(res.message);
      setDone(true);
    } catch (err) {
      toast.error((err as Error).message || "Could not subscribe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative rounded-xl bg-gradient-to-br from-ink to-[#0f2945] text-white p-8 overflow-hidden">
      <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-gold/20 blur-2xl" />
      <p className="eyebrow text-gold mb-3">Stay in touch</p>
      <h3 className="font-display text-2xl font-bold leading-tight mb-2">
        Quiet emails, honest deals.
      </h3>
      <p className="text-white/70 text-sm mb-6">Seasonal tips and the odd last-minute spot.</p>
      {done ? (
        <div className="rounded-md bg-white/10 border border-white/20 p-4 text-sm">
          Thanks — we'll be in touch at <span className="text-gold font-semibold">{email}</span>.
        </div>
      ) : (
        <form className="space-y-3 relative" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail address"
            className="w-full h-[46px] px-4 rounded-md bg-white text-ink placeholder:text-ink/40 outline-none text-sm border border-transparent focus:border-gold transition"
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-[46px] rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-gold transition disabled:opacity-50"
          >
            {submitting ? "..." : "Sign up"}
          </button>
        </form>
      )}
    </div>
  );
}

/* ============================== ICONS ============================== */

function PinIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function CalIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function UserIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function ClockIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function ShieldIco() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function BadgeIco() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14 6 22l6-3 6 3-2.5-8" />
    </svg>
  );
}
function CoinIco() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="6" rx="9" ry="3" />
      <path d="M3 6v6c0 1.66 4 3 9 3s9-1.34 9-3V6" />
      <path d="M3 12v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" />
    </svg>
  );
}
function ChatIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function ShareIco() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}
