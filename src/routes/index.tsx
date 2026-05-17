import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import heroImg from "@/assets/hero-lisbon.jpg";
import alfamaImg from "@/assets/tour-alfama.jpg";
import sintraImg from "@/assets/tour-sintra.jpg";
import belemImg from "@/assets/dest-belem.jpg";
import cascaisImg from "@/assets/dest-cascais.jpg";
import caboImg from "@/assets/tour-caboroca.jpg";
import vanImg from "@/assets/fleet-van.jpg";
import { tours } from "@/data/tours";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { BookingModal } from "@/components/site/BookingModal";
import type { Tour } from "@/data/tours";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Saudade — Discover Portugal · Private Tours of Lisboa, Sintra & the Coast" },
      {
        name: "description",
        content:
          "Plan your Portugal trip with Saudade. Browse popular private tuk-tuk, Sintra, Belém, Cascais and sunset tours. Real local guides, flexible departures, instant inquiry.",
      },
      { property: "og:title", content: "Saudade — Discover Portugal" },
      {
        property: "og:description",
        content:
          "Private tours, flash deals and curated itineraries across Lisboa, Sintra, Belém and the Atlantic coast.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const [bookingTour, setBookingTour] = useState<Tour | null>(null);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav overlay />
      <Hero />
      <AboutSection />
      <FlashDeals />
      <WhyTravel />
      <PopularTours onBook={setBookingTour} />
      <Destinations />
      <Gallery />
      <TravelTipsAndSignup />
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

/* ============================== HERO ============================== */

function Hero() {
  return (
    <section className="relative pt-[88px] md:pt-[120px] pb-0">
      <div className="relative h-[520px] sm:h-[560px] md:h-[640px] overflow-hidden">
        <img
          src={heroImg}
          alt="Discover Lisboa, Portugal"
          className="absolute inset-0 w-full h-full object-cover animate-[scale-in_1.6s_var(--ease-out-expo)_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-ink/75" />

        <div className="relative container-x h-full flex flex-col justify-center text-white">
          <p className="eyebrow text-white/90 mb-3 md:mb-4 animate-[fade-up_0.9s_var(--ease-out-expo)_both]">
            ◆  Discover
          </p>
          <h1
            className="font-display font-bold tracking-tight leading-[0.95] mb-5 md:mb-6 text-white animate-[fade-up_1s_var(--ease-out-expo)_0.1s_both]"
            style={{ fontSize: "clamp(44px, 13vw, 160px)" }}
          >
            PORTUGAL
          </h1>
          <p className="max-w-xl text-white/90 text-[15px] md:text-lg leading-relaxed animate-[fade-up_1s_var(--ease-out-expo)_0.2s_both]">
            A land of cinnamon-tiled rooftops, Atlantic cliffs and slow afternoons. Explore
            with a private guide — by tuk-tuk, by Mercedes, by foot — entirely your own pace.
          </p>

          <div className="absolute right-6 bottom-16 hidden lg:block animate-[fade-in_1.4s_var(--ease-out-expo)_0.4s_both]">
            <svg width="220" height="120" viewBox="0 0 220 120" fill="none">
              <path
                d="M10 100 Q 80 10, 200 30"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="3 5"
                fill="none"
              />
              <circle cx="200" cy="30" r="5" fill="#2bb6f7" />
              <text x="160" y="20" fill="white" fontSize="11" fontFamily="Poppins">
                Sintra
              </text>
              <text x="15" y="115" fill="white" fontSize="11" fontFamily="Poppins">
                Lisboa
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* Floating search bar */}
      <div className="relative container-x -mt-10 md:-mt-12 z-10">
        <SearchBar />
      </div>
    </section>
  );
}

function SearchBar() {
  return (
    <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(30,58,95,0.15)] p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 md:gap-2 items-end">
      <SearchField label="Destinations" placeholder="City, region, or anywhere">
        <PinIco />
      </SearchField>
      <SearchField label="Check in" placeholder="dd / mm / yy" type="date">
        <CalIco />
      </SearchField>
      <SearchField label="Check out" placeholder="dd / mm / yy" type="date">
        <CalIco />
      </SearchField>
      <SearchField label="People" placeholder="2" type="number">
        <UserIco />
      </SearchField>
      <SearchField label="Max Budget" placeholder="€1,500" type="number">
        <span className="text-[13px] font-semibold">€</span>
      </SearchField>
      <button className="sm:col-span-2 md:col-span-1 h-[52px] rounded-full bg-gold text-white font-semibold text-[13px] tracking-widest uppercase shadow-[0_8px_20px_rgba(43,182,247,0.4)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.4)] transition-all">
        Search Tour
      </button>
    </div>
  );
}

function SearchField({
  label,
  placeholder,
  type = "text",
  children,
}: {
  label: string;
  placeholder: string;
  type?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-ink/60 uppercase tracking-widest mb-2">
        {label}
      </span>
      <span className="flex items-center gap-2 px-3 h-[44px] rounded-md border border-border bg-cloud/40 focus-within:border-gold transition">
        <span className="text-gold shrink-0">{children}</span>
        <input
          type={type}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink/40 outline-none min-w-0"
        />
      </span>
    </label>
  );
}

/* ============================== ABOUT ============================== */

function AboutSection() {
  return (
    <section className="container-x py-16 md:py-32 grid md:grid-cols-2 gap-12 md:gap-16 items-center">
      <div>
        <p className="eyebrow text-gold mb-4">About Us</p>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight mb-6">
          A boutique travel house, rooted in Lisboa since 2012.
        </h2>
        <p className="text-body leading-relaxed mb-8">
          We are a small team of native guides, chauffeurs, and concierges who design private
          journeys across Portugal. Every itinerary is custom — never a coach, never a crowd.
          From the Moorish lanes of Alfama to the mist-wrapped palaces of Sintra, we travel slow,
          we travel local, and we travel only with you.
        </p>

        <ul className="grid grid-cols-2 gap-y-3 gap-x-6 mb-10">
          {[
            "5 Star Accommodations",
            "Handpick Hotels",
            "Accessibility Management",
            "First Class Flights",
            "Inclusive Packages",
            "Private 24/7 Concierge",
          ].map((f) => (
            <li key={f} className="flex items-center gap-3 text-[14px] text-ink">
              <span className="w-5 h-5 rounded-full bg-gold/15 text-gold flex items-center justify-center text-[12px]">
                ✓
              </span>
              {f}
            </li>
          ))}
        </ul>

        <Link
          to="/about"
          className="inline-flex items-center px-8 py-4 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.35)] transition-all"
        >
          Learn More
        </Link>
      </div>

      <div className="relative">
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-gold/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full border-2 border-dashed border-gold/40" />
        <div className="relative rounded-[40%_60%_50%_50%/40%_50%_60%_50%] overflow-hidden h-[460px] shadow-[0_30px_60px_rgba(30,58,95,0.15)]">
          <img src={cascaisImg} alt="Cascais coast" className="w-full h-full object-cover" />
          <button
            aria-label="Play video"
            className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition group"
          >
            <svg width="18" height="20" viewBox="0 0 18 20" fill="currentColor" className="text-gold ml-1">
              <path d="M0 0v20l18-10L0 0z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================== FLASH DEALS ============================== */

function FlashDeals() {
  const deals = tours.slice(0, 4);
  return (
    <section className="bg-cloud/60 py-20 md:py-24">
      <div className="container-x">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
              Flash Deal
            </h2>
            <p className="text-body text-sm">Our best last-minute offers. Book now and go!</p>
          </div>
          <Link to="/tours" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
            View All ›
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {deals.map((t) => (
            <FlashCard key={t.slug} tour={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FlashCard({ tour }: { tour: Tour }) {
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] hover:-translate-y-1 transition-all duration-500"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow">
          €{tour.priceFrom}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display font-semibold text-ink text-[15px] leading-snug mb-2 group-hover:text-gold transition-colors">
          {tour.title}
        </h3>
        <div className="flex items-center gap-1 text-gold text-[11px] mb-3">
          ★★★★★ <span className="text-ink/40 ml-1">(124)</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-body">
          <span className="flex items-center gap-1"><PinIco /> Lisboa</span>
          <span>{tour.duration}</span>
        </div>
      </div>
    </Link>
  );
}

/* ============================== WHY TRAVEL ============================== */

function WhyTravel() {
  const features = [
    {
      title: "Stay Safe",
      body: "Vetted vehicles, licensed guides, 24/7 concierge support — your journey is in trusted hands.",
      icon: <ShieldIco />,
    },
    {
      title: "Quality Services",
      body: "Hand-picked hotels, private vehicles, table reservations and skip-the-line palace tickets.",
      icon: <BadgeIco />,
    },
    {
      title: "Save Money",
      body: "Transparent flat pricing — no commissions, no hidden upsells, no surprises at checkout.",
      icon: <CoinIco />,
    },
  ];
  return (
    <section className="container-x py-20 md:py-28 relative">
      <svg
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full hidden md:block"
        height="120"
        viewBox="0 0 1200 120"
        fill="none"
      >
        <path
          d="M0 80 Q 300 0, 600 80 T 1200 80"
          stroke="#2bb6f7"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.4"
        />
      </svg>

      <div className="text-center mb-14">
        <p className="eyebrow text-gold mb-3">Why travel with Saudade</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
          Slow, private, unforgettable.
        </h2>
      </div>

      <div className="relative grid md:grid-cols-3 gap-8">
        {features.map((f) => (
          <div key={f.title} className="text-center px-4">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white border-2 border-gold/20 flex items-center justify-center text-gold shadow-[0_10px_30px_rgba(30,58,95,0.08)]">
              {f.icon}
            </div>
            <h3 className="font-display text-xl font-semibold text-ink mb-3">{f.title}</h3>
            <p className="text-body text-sm leading-relaxed max-w-xs mx-auto">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================== POPULAR TOURS ============================== */

function PopularTours({ onBook }: { onBook: (t: Tour) => void }) {
  return (
    <section className="bg-cloud/60 py-20 md:py-28">
      <div className="container-x">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
              Popular Tour
            </h2>
            <p className="text-body text-sm">Most-loved private experiences from our collection.</p>
          </div>
          <Link to="/tours" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
            View All ›
          </Link>
        </div>

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
  return (
    <article className="bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] transition-all duration-500 group">
      <Link to="/tours/$slug" params={{ slug: tour.slug }} className="relative block aspect-[16/10] overflow-hidden">
        <img src={tour.image} alt={tour.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
        {tour.featured && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            High Rate
          </span>
        )}
      </Link>
      <div className="p-6">
        <h3 className="font-display font-semibold text-ink text-[16px] leading-snug mb-2 hover:text-gold transition-colors">
          <Link to="/tours/$slug" params={{ slug: tour.slug }}>{tour.title}</Link>
        </h3>
        <div className="flex items-center gap-1 text-gold text-[11px] mb-4">
          ★★★★★ <span className="text-ink/40 ml-1">(reviews)</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-body mb-5 pb-5 border-b border-border">
          <span className="flex items-center gap-1.5"><PinIco /> Portugal</span>
          <span className="flex items-center gap-1.5"><ClockIco /> {tour.duration}</span>
          <span className="flex items-center gap-1.5"><UserIco /> {tour.featured ? "Private" : "2+ pax"}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-body uppercase tracking-widest">From </span>
            <span className="text-gold font-display font-bold text-2xl">€{tour.priceFrom}</span>
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
  const dests = [
    { name: "Lisboa", count: 12, img: heroImg },
    { name: "Sintra", count: 6, img: sintraImg },
    { name: "Belém", count: 4, img: belemImg },
    { name: "Cascais", count: 5, img: cascaisImg },
    { name: "Cabo da Roca", count: 3, img: caboImg },
    { name: "Alfama", count: 8, img: alfamaImg },
  ];
  const [active, setActive] = useState(2);

  return (
    <section className="container-x py-20 md:py-28">
      <div className="text-center mb-14">
        <p className="eyebrow text-gold mb-3">Choose Your Destinations</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
          Where in Portugal will it be?
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
              <img src={d.img} alt={d.name} className="w-full h-full object-cover" />
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
  const imgs = [
    alfamaImg, sintraImg, belemImg, cascaisImg,
    caboImg, heroImg, vanImg, alfamaImg,
    sintraImg, belemImg, cascaisImg, caboImg,
  ];
  return (
    <section className="bg-cloud/40 py-20 md:py-24">
      <div className="container-x">
        <div className="text-center mb-12">
          <p className="eyebrow text-gold mb-3">Tourist's Shared Photo</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
            Moments from our travelers.
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
              <img
                src={src}
                alt=""
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
  const tips = [
    {
      date: "11/22/2024",
      comments: 2,
      shares: 5,
      title: "Skogafoss",
      excerpt:
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium…",
      img: sintraImg,
    },
    {
      date: "11/15/2024",
      comments: 2,
      shares: 3,
      title: "A weekend in Sintra: hidden palaces & pine forests",
      excerpt:
        "A practical guide to spending two slow days in Portugal's most romantic hilltop town — from breakfast to nightfall.",
      img: caboImg,
    },
  ];
  return (
    <section className="container-x py-20 md:py-28">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2">
            Travel Tips
          </h2>
          <p className="text-body text-sm">Stories, guides and seasonal advice from our concierge.</p>
        </div>
        <Link to="/tours" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition">
          View All ›
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tips.map((t) => (
          <article key={t.title} className="bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] transition-shadow group">
            <div className="aspect-[16/10] overflow-hidden">
              <img src={t.img} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="p-6">
              <div className="flex gap-4 text-[11px] text-body mb-3">
                <span className="flex items-center gap-1.5"><CalIco /> {t.date}</span>
                <span className="flex items-center gap-1.5"><ChatIco /> {t.comments} Comments</span>
                <span className="flex items-center gap-1.5"><ShareIco /> {t.shares} Shares</span>
              </div>
              <h3 className="font-display font-semibold text-ink text-lg leading-snug mb-3 hover:text-gold transition-colors">
                {t.title}
              </h3>
              <p className="text-body text-sm leading-relaxed mb-5 line-clamp-2">{t.excerpt}</p>
              <button className="text-[11px] font-semibold uppercase tracking-widest text-gold border-b-2 border-gold pb-1 hover:text-ink hover:border-ink transition">
                Read more
              </button>
            </div>
          </article>
        ))}

        {/* Signup card */}
        <div className="relative rounded-xl bg-gradient-to-br from-ink to-[#0f2945] text-white p-8 overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-gold/20 blur-2xl" />
          <p className="eyebrow text-gold mb-3">Sign up</p>
          <h3 className="font-display text-2xl font-bold leading-tight mb-2">
            …to get newsletter
          </h3>
          <p className="text-white/70 text-sm mb-6">& receive our best offer.</p>
          <form className="space-y-3 relative">
            <input
              type="email"
              placeholder="E-mail address"
              className="w-full h-[46px] px-4 rounded-md bg-white text-ink placeholder:text-ink/40 outline-none text-sm border border-transparent focus:border-gold transition"
            />
            <button className="w-full h-[46px] rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-gold transition">
              Sign up
            </button>
          </form>
        </div>
      </div>
    </section>
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
