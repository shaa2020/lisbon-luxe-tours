import { createFileRoute } from "@tanstack/react-router";
import vanImg from "@/assets/fleet-van.jpg";
import alfamaImg from "@/assets/tour-alfama.jpg";
import sintraImg from "@/assets/tour-sintra.jpg";
import caboImg from "@/assets/tour-caboroca.jpg";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Tuk Tuk 24 Private Tours of Portugal" },
      {
        name: "description",
        content:
          "Founded in Lisboa in 2012. A boutique fleet of electric tuk-tuks and Mercedes vans, operated by a small team of multilingual local guides.",
      },
      { property: "og:title", content: "About Tuk Tuk 24" },
      {
        property: "og:description",
        content: "The philosophy, the people, and the fleet behind our private Portugal experiences.",
      },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav overlay />

      {/* Page header */}
      <header className="relative pt-[120px] pb-12">
        <div className="relative h-[320px] md:h-[380px] overflow-hidden">
          <img src={vanImg} alt="Tuk Tuk 24 Mercedes V-Class fleet on a Lisbon street" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-ink/55" />
          <div className="container-x relative h-full flex flex-col justify-center text-white">
            <p className="eyebrow text-white/80 mb-3">◆  Our Philosophy</p>
            <h1 className="font-display font-bold text-5xl md:text-6xl mb-4 leading-[1.05]">
              Travel slow.<br />Travel local.
            </h1>
            <p className="text-white/85 max-w-xl">
              Tuk Tuk 24 is a boutique travel house founded in Lisboa in 2012 — built around
              private guides, quiet vehicles, and itineraries with breathing room.
            </p>
          </div>
        </div>
      </header>

      {/* Intro */}
      <section className="container-x py-20 grid md:grid-cols-2 gap-16 items-center">
        <div className="relative">
          <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full bg-gold/10" />
          <img
            src={alfamaImg}
            alt="A quiet morning in Alfama"
            className="relative rounded-2xl shadow-[0_20px_50px_rgba(30,58,95,0.15)] w-full h-[460px] object-cover"
          />
        </div>
        <div>
          <p className="eyebrow text-gold mb-3">Our Story</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6 leading-tight">
            A small house, with a long table.
          </h2>
          <p className="text-body leading-relaxed mb-5">
            We began with one electric tuk-tuk and the belief that Lisbon deserved to be shown — not
            performed. A decade later, our team of Lisboeta guides and chauffeurs designs private
            journeys for travellers who would rather see one neighborhood deeply than ten quickly.
          </p>
          <p className="text-body leading-relaxed">
            Every itinerary is custom. Every guide was born here. And the only currency we trade
            in is time — yours, ours, and the city's.
          </p>
        </div>
      </section>

      {/* Fleet */}
      <section className="bg-ink text-white py-20 md:py-24">
        <div className="container-x">
          <div className="text-center mb-14">
            <p className="eyebrow text-gold mb-3">The Fleet</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              Four vehicles. One standard.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { t: "Electric Tuk-Tuk", d: "Up to 6 guests · Open-air · Silent through the alleys of Alfama." },
              { t: "Premium Tuk-Tuk", d: "4 guests · Convertible roof · Heated seats for winter mornings." },
              { t: "Luxury SUV", d: "Up to 4 guests · Leather interior · Climate controlled." },
              { t: "Mercedes V-Class", d: "Up to 7 guests · Captain chairs · WiFi · Long-distance comfort." },
            ].map((v) => (
              <div
                key={v.t}
                className="bg-white/[0.04] border border-white/10 rounded-xl p-7 hover:bg-white/[0.08] hover:border-gold/40 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gold/20 text-gold flex items-center justify-center shrink-0">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 13l2-6h14l2 6M5 13h14M5 13v5M19 13v5" />
                      <circle cx="8" cy="18" r="2" />
                      <circle cx="16" cy="18" r="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white mb-2">{v.t}</h3>
                    <p className="text-sm text-white/70 leading-relaxed">{v.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="container-x py-20 md:py-24">
        <div className="grid md:grid-cols-3 gap-10 text-center">
          {[
            { k: "12+", v: "Years guiding" },
            { k: "100%", v: "Electric tuk-tuks" },
            { k: "4.97", v: "Avg review · 1.2k stays" },
          ].map((s) => (
            <div key={s.v} className="p-8 rounded-2xl bg-cloud/60 border border-border hover:border-gold/40 transition-colors">
              <p className="font-display font-bold text-5xl md:text-6xl text-gold mb-2">{s.k}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/60">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team / values */}
      <section className="bg-cloud/60 py-20 md:py-24">
        <div className="container-x grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p className="eyebrow text-gold mb-3">Why Tuk Tuk 24</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-6 leading-tight">
              The small print that actually matters.
            </h2>
            <ul className="space-y-4">
              {[
                { t: "Never shared.", d: "Every tour runs as a single private party — your group only." },
                { t: "Native guides.", d: "Born in Lisboa, trained for years, paid fairly, never scripted." },
                { t: "Flat pricing.", d: "What you see is what you pay. No commissions, no surprises." },
                { t: "Free 24h cancel.", d: "Plans change. We get it. Cancel up to 24h before with no fee." },
              ].map((v) => (
                <li key={v.t} className="flex gap-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-gold/15 text-gold flex items-center justify-center text-[12px] font-bold">✓</span>
                  <div>
                    <p className="font-display font-semibold text-ink">{v.t}</p>
                    <p className="text-body text-sm leading-relaxed">{v.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <img src={sintraImg} alt="Sintra romantic palace surrounded by pine forests" className="rounded-2xl object-cover h-64 w-full" />
            <img src={caboImg} alt="Cabo da Roca sunset over the Atlantic Ocean" className="rounded-2xl object-cover h-64 w-full mt-10" />
            <img src={alfamaImg} alt="Alfama neighborhood with terracotta rooftops" className="rounded-2xl object-cover h-64 w-full -mt-6" />
            <img src={vanImg} alt="Tuk Tuk 24 luxury van ready for a private Portugal tour" className="rounded-2xl object-cover h-64 w-full" />
          </div>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
