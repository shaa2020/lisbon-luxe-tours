import { createFileRoute } from "@tanstack/react-router";
import vanImg from "@/assets/fleet-van.jpg";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About & The Fleet — Lusitano Private Lisbon Tours" },
      {
        name: "description",
        content:
          "Founded in 2012. An electric tuk-tuk fleet, Mercedes V-Class vans, and a small team of multilingual Lisbon natives.",
      },
      { property: "og:title", content: "About Lusitano" },
      {
        property: "og:description",
        content: "The philosophy and fleet behind our private experiences.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />

      <header className="pt-40 pb-20 px-6 md:px-10 max-w-5xl mx-auto">
        <p className="eyebrow text-gold mb-4">Our Philosophy</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-8 text-balance">
          Travel slowly, <span className="italic">privately,</span> and with someone who genuinely loves
          the place.
        </h1>
        <p className="max-w-2xl text-lg text-ink/70 leading-relaxed">
          Lusitano began in 2012 with a single electric tuk-tuk and the belief that Lisbon deserved
          to be shown — not performed. A decade later, our small team of Lisbon-born guides and
          chauffeurs operates a quiet fleet of electric tuk-tuks and Mercedes vans across Portugal.
        </p>
      </header>

      <section className="bg-ink text-white py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <img
            src={vanImg}
            alt="The fleet interior"
            loading="lazy"
            width={1024}
            height={1024}
            className="rounded-3xl object-cover aspect-square"
          />
          <div>
            <p className="eyebrow text-gold mb-4">The Fleet</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-8">Four vehicles, one standard</h2>
            <dl className="space-y-8">
              {[
                { t: "Electric Tuk-Tuk", d: "Up to 6 guests · Open-air · Silent" },
                { t: "Premium Tuk-Tuk", d: "4 guests · Convertible roof · Heated seats" },
                { t: "Luxury SUV", d: "Up to 4 guests · Leather · Climate controlled" },
                { t: "Mercedes V-Class", d: "Up to 7 guests · Captain chairs · Wifi" },
              ].map((v) => (
                <div key={v.t} className="flex items-baseline justify-between border-b border-white/10 pb-6">
                  <dt className="font-serif text-2xl">{v.t}</dt>
                  <dd className="eyebrow text-white/60 text-right">{v.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-6 md:px-10 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-12 text-center">
          {[
            { k: "12+", v: "Years guiding" },
            { k: "100%", v: "Electric tuk-tuks" },
            { k: "4.97", v: "Average review (1.2k)" },
          ].map((s) => (
            <div key={s.v}>
              <p className="font-serif text-6xl md:text-7xl text-gold mb-2">{s.k}</p>
              <p className="eyebrow text-ink/60">{s.v}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
