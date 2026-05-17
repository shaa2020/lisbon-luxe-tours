import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-lisbon.jpg";
import vanImg from "@/assets/fleet-van.jpg";
import { tours, categories } from "@/data/tours";
import { TourCard } from "@/components/site/TourCard";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/")({
  component: Index,
});

const reviews = [
  {
    name: "Sophia Bernard",
    origin: "Paris, France",
    quote:
      "An afternoon that felt entirely our own — our guide unlocked the Alfama I'd been chasing for years. Discreet, knowledgeable, and effortlessly elegant.",
  },
  {
    name: "James Whitaker",
    origin: "London, UK",
    quote:
      "The Sintra day in the V-Class was flawless. They skipped every line, knew exactly where the light would be best, and never once felt like a tourist circuit.",
  },
  {
    name: "Mia Tanaka",
    origin: "Tokyo, Japan",
    quote:
      "Cabo da Roca at sunset, sparkling wine in hand. This is how Lisbon should be seen — slowly, privately, and with someone who genuinely loves it.",
  },
];

const faqs = [
  {
    q: "Are your tuk-tuks electric?",
    a: "Yes — our entire tuk-tuk fleet is 100% electric, which means a silent ride through Alfama's narrow streets and zero local emissions.",
  },
  {
    q: "Do you pick up from my hotel?",
    a: "Every experience includes door-to-door pick-up and drop-off anywhere in central Lisbon. For Sintra and Cascais tours we also reach surrounding suburbs.",
  },
  {
    q: "Can I customise the itinerary?",
    a: "Absolutely. Most clients book a signature route and then add a stop or two — a vineyard, a private rooftop dinner, a specific viewpoint. Just tell your concierge.",
  },
  {
    q: "What languages do your guides speak?",
    a: "Native English and Portuguese always. French, Spanish, German and Italian on request — please flag at booking.",
  },
];

function Index() {
  const featured = tours.filter((t) => t.featured);

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-gold/20">
      <Nav overlay />

      {/* Hero */}
      <section className="relative h-[92vh] flex items-center justify-center overflow-hidden bg-ink">
        <img
          src={heroImg}
          alt="Lisbon rooftops at golden hour"
          width={1920}
          height={1088}
          className="absolute inset-0 w-full h-full object-cover opacity-65 animate-[scale-in_1.4s_var(--ease-out-expo)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/40" />
        <div className="relative z-10 text-center px-4 animate-[fade-up_1s_var(--ease-out-expo)_both]">
          <p className="text-gold-muted eyebrow mb-6">Lisbon · Sintra · Cascais</p>
          <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-white italic leading-[0.95] mb-12 max-w-4xl mx-auto text-balance">
            The soul of Portugal,
            <br />
            curated for the <span className="text-gold">discerning.</span>
          </h1>

          <div className="mx-auto max-w-3xl bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/15 shadow-2xl flex flex-col md:flex-row gap-2">
            <div className="flex-1 px-6 py-3 flex flex-col items-start text-left">
              <span className="text-[9px] uppercase tracking-widest text-white/50 mb-1">Destination</span>
              <span className="text-sm text-white">Sintra Palace Gardens</span>
            </div>
            <div className="flex-1 px-6 py-3 flex flex-col items-start text-left md:border-l border-white/10">
              <span className="text-[9px] uppercase tracking-widest text-white/50 mb-1">When</span>
              <span className="text-sm text-white">Check availability</span>
            </div>
            <Link
              to="/tours"
              className="bg-gold hover:bg-gold-muted text-ink font-medium px-10 py-4 rounded-xl transition-all uppercase text-xs tracking-widest text-center"
            >
              Inquire Now
            </Link>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 md:mb-20 gap-8">
          <div className="max-w-xl">
            <p className="eyebrow text-gold mb-4">Signature Journeys</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-6">Beyond the standard routes</h2>
            <p className="text-ink/60 leading-relaxed text-pretty">
              Quiet access to the corners of Portugal that remain whispered secrets — curated by
              people who grew up on these hills.
            </p>
          </div>
          <Link
            to="/tours"
            className="eyebrow border-b border-gold pb-1 hover:text-gold transition-colors"
          >
            View all experiences →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {featured.map((t, i) => (
            <TourCard key={t.slug} tour={t} offset={i === 1} />
          ))}
        </div>
      </section>

      {/* Philosophy / Fleet */}
      <section className="bg-ink text-white py-24 md:py-32 mt-20">
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-2 gap-16 md:gap-20 items-center">
          <div className="relative">
            <img
              src={vanImg}
              alt="Luxury Mercedes V-Class interior"
              loading="lazy"
              width={1024}
              height={1024}
              className="w-full aspect-square rounded-3xl object-cover"
            />
            <div className="absolute -bottom-8 -right-4 md:-bottom-10 md:-right-10 w-48 md:w-64 aspect-square bg-gold p-8 rounded-2xl flex flex-col justify-end shadow-2xl">
              <span className="text-[40px] font-serif leading-none mb-4">01.</span>
              <p className="text-xs uppercase tracking-widest font-medium text-ink">The Modern Fleet</p>
            </div>
          </div>
          <div>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 leading-tight">
              Luxury is in the
              <br />
              <span className="italic">unseen details.</span>
            </h2>
            <p className="text-white/60 mb-10 leading-relaxed">
              Our fleet pairs the charm of electric open-air tuk-tuks with the refined comfort of
              executive Mercedes-Benz vehicles. Each journey is private, climate-controlled when
              needed, and curated with local refreshments.
            </p>
            <ul className="space-y-6">
              {[
                "Professional multilingual guides",
                "Bespoke itinerary planning",
                "Door-to-door concierge pick-up",
                "100% electric tuk-tuk fleet",
              ].map((item) => (
                <li key={item} className="flex items-center gap-4 group">
                  <div className="w-8 h-px bg-gold group-hover:w-12 transition-all" />
                  <span className="eyebrow">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Destinations grid */}
      <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="eyebrow text-gold mb-4">Where We Go</p>
          <h2 className="font-serif text-4xl md:text-5xl">Six destinations, one obsession</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { name: "Lisbon", count: "12 tours" },
            { name: "Sintra", count: "5 tours" },
            { name: "Belém", count: "4 tours" },
            { name: "Cascais", count: "3 tours" },
            { name: "Alfama", count: "6 tours" },
            { name: "Cabo da Roca", count: "2 tours" },
          ].map((d) => (
            <div
              key={d.name}
              className="aspect-[4/3] rounded-2xl bg-secondary border border-ink/5 p-6 flex flex-col justify-between hover:bg-ink hover:text-paper transition-colors group cursor-pointer"
            >
              <span className="eyebrow text-ink/40 group-hover:text-paper/60">{d.count}</span>
              <h3 className="font-serif text-3xl md:text-4xl italic">{d.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-secondary py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow text-gold mb-4">Travelers Whisper</p>
            <h2 className="font-serif text-4xl md:text-5xl">Words from our guests</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {reviews.map((r) => (
              <figure key={r.name} className="bg-paper rounded-2xl p-8 border border-ink/5">
                <div className="text-gold text-lg mb-4">★★★★★</div>
                <blockquote className="font-serif italic text-xl leading-snug mb-6">
                  "{r.quote}"
                </blockquote>
                <figcaption>
                  <p className="font-medium text-sm">{r.name}</p>
                  <p className="text-xs text-ink/50 mt-1">{r.origin}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Categories list */}
      <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          <div>
            <p className="eyebrow text-gold mb-4">Tour Categories</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 leading-tight">
              Choose your <span className="italic">manner</span> of travel.
            </h2>
            <p className="text-ink/60 leading-relaxed mb-8">
              From open-air tuk-tuks for sun-drenched mornings to chauffeured Mercedes for full-day
              expeditions — every category is private, every detail considered.
            </p>
            <Link
              to="/contact"
              className="inline-block px-8 py-4 bg-ink text-paper rounded-full eyebrow font-medium hover:bg-gold hover:text-ink transition-colors"
            >
              Design Custom Tour
            </Link>
          </div>
          <ul className="divide-y divide-ink/10 border-y border-ink/10">
            {categories.map((c, i) => (
              <li key={c.slug}>
                <Link
                  to="/tours"
                  className="group flex items-center justify-between py-6 hover:text-gold transition-colors"
                >
                  <span className="flex items-baseline gap-6">
                    <span className="font-mono text-xs text-ink/40">0{i + 1}</span>
                    <span className="font-serif text-2xl md:text-3xl">{c.title}</span>
                  </span>
                  <span className="eyebrow opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ink text-white py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow text-gold mb-4">Frequently Asked</p>
            <h2 className="font-serif text-4xl md:text-5xl">Considered answers</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group border border-white/10 rounded-2xl p-6 open:bg-white/5 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-serif text-xl md:text-2xl pr-4">{f.q}</span>
                  <span className="text-gold text-2xl transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-white/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="eyebrow text-gold mb-4">Stay In Touch</p>
          <h2 className="font-serif text-4xl md:text-5xl mb-6 leading-tight">
            Seasonal offers, <span className="italic">never spam.</span>
          </h2>
          <p className="text-ink/60 mb-10">
            A quiet letter once a month — new itineraries, vineyard openings, and Lisbon insider notes.
          </p>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto"
          >
            <input
              type="email"
              required
              placeholder="your@email.com"
              className="flex-1 px-5 py-4 rounded-full bg-secondary border border-ink/10 focus:outline-none focus:border-gold transition"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-ink text-paper rounded-full eyebrow font-medium hover:bg-gold hover:text-ink transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
