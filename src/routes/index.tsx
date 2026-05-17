import { createFileRoute, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-lisbon.jpg";
import alfamaImg from "@/assets/tour-alfama.jpg";
import sintraImg from "@/assets/tour-sintra.jpg";
import belemImg from "@/assets/dest-belem.jpg";
import cascaisImg from "@/assets/dest-cascais.jpg";
import caboImg from "@/assets/tour-caboroca.jpg";
import vanImg from "@/assets/fleet-van.jpg";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen Lisboa — Private Tuk Tuk & Luxury Tours in Portugal" },
      {
        name: "description",
        content:
          "Private tuk-tuk and chauffeured tours across Lisbon, Sintra, Belém, Cascais and Cabo da Roca. Cinematic itineraries crafted by locals.",
      },
      { property: "og:title", content: "Lumen Lisboa — Cinematic Private Tours of Portugal" },
      {
        property: "og:description",
        content: "From Alfama's azulejo-lined alleys to Sintra's mist-wreathed palaces — a quiet, private way to see Portugal.",
      },
      { property: "og:image", content: "/og-portugal.jpg" },
    ],
  }),
  component: Index,
});

const quickFacts = [
  { img: alfamaImg, top: "7 districts", bottom: "across Lisboa" },
  { img: sintraImg, top: "Pena, Quinta,", bottom: "Monserrate" },
  { img: belemImg, top: "Pastéis warm", bottom: "from the oven" },
  { img: cascaisImg, top: "Sunset wine", bottom: "by the Atlantic" },
  { img: caboImg, top: "Westernmost", bottom: "tip of Europe" },
];

const itinerary = [
  {
    days: "Day 01 — 02",
    place: "Lisboa & Alfama",
    body:
      "Begin in the old Moorish quarter — fado echoing from tavernas, miradouros at golden hour, ginjinha from a chipped ceramic cup. Tram 28, São Jorge castle, the tile museum in Madre de Deus.",
    imgs: [alfamaImg, belemImg],
  },
  {
    days: "Day 03 — 04",
    place: "Belém & the River",
    body:
      "Jerónimos Monastery before the queues form, custard tarts at the original Pastéis de Belém, the Tower at low tide. A river-side lunch of grilled sardines and vinho verde.",
    imgs: [belemImg],
  },
  {
    days: "Day 05 — 06",
    place: "Sintra & Cabo da Roca",
    body:
      "Up through Sintra's misty laurel forest to Pena Palace and the Initiation Well at Quinta da Regaleira. Travesseiros in the village, then west to the very edge of the continent.",
    imgs: [sintraImg, caboImg],
  },
  {
    days: "Day 07",
    place: "Cascais Coast",
    body:
      "Boca do Inferno at sunrise, Guincho beach for surfers and sea spray, lunch in a fisherman's cantina. End with a private rooftop sundowner overlooking the marina.",
    imgs: [cascaisImg],
  },
];

const included = [
  { icon: "🛺", title: "Electric Tuk-Tuks", body: "Silent, zero-emission rides through Alfama's narrow lanes — open-air, sunset-ready." },
  { icon: "🚐", title: "Mercedes V-Class", body: "Chauffeured executive vans for Sintra & Cascais days. Leather, climate, chilled water." },
  { icon: "🥂", title: "Tastings Included", body: "Pastéis de nata, vinho do Porto, ginjinha & a vineyard stop on full-day itineraries." },
  { icon: "🗝️", title: "Local Concierge", body: "A multilingual guide who grew up on these hills — bookings, skip-the-line, reservations." },
];

function Index() {
  return (
    <div className="min-h-screen bg-[#0b0b09] text-white selection:bg-gold/20">
      <Nav overlay />

      {/* HERO with oversized title */}
      <section className="relative min-h-[100vh] flex flex-col justify-end overflow-hidden bg-black">
        <img
          src={heroImg}
          alt="Lisbon rooftops at golden hour with the Tagus river"
          width={1920}
          height={1088}
          className="absolute inset-0 w-full h-full object-cover opacity-80 animate-[scale-in_1.6s_var(--ease-out-expo)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85" />

        {/* oversized PORTUGAL wordmark */}
        <div className="relative z-10 px-4 pt-32 md:pt-40 text-center animate-[fade-up_1s_var(--ease-out-expo)_both]">
          <p className="eyebrow text-gold-muted mb-4">Lisboa · Sintra · Cascais · Belém</p>
          <h1
            className="font-serif italic text-white/95 leading-[0.85] tracking-tight mx-auto"
            style={{ fontSize: "clamp(72px, 18vw, 280px)" }}
          >
            Portugal
          </h1>
        </div>

        {/* facts strip + book card */}
        <div className="relative z-10 px-4 md:px-10 pb-12 md:pb-16 mt-12 md:mt-16">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {quickFacts.map((f, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-white/15 group cursor-pointer animate-[fade-up_1s_var(--ease-out-expo)_both]"
                  style={{ animationDelay: `${0.2 + i * 0.08}s` }}
                >
                  <img src={f.img} alt={f.top} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3 text-[11px] leading-tight text-white">
                    <div>{f.top}</div>
                    <div className="text-white/70">{f.bottom}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/tours"
              className="lg:w-64 w-full text-center px-10 py-5 rounded-full border border-gold/60 bg-white/5 backdrop-blur-md text-white eyebrow hover:bg-gold hover:text-ink transition-colors"
            >
              Book a Journey
            </Link>
          </div>
        </div>

        {/* floating social rail */}
        <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 flex-col gap-3">
          {["IG", "FB", "TG"].map((s) => (
            <a
              key={s}
              href="#"
              className="w-10 h-10 rounded-full border border-white/20 grid place-items-center text-[10px] tracking-widest text-white/70 hover:bg-gold hover:text-ink hover:border-gold transition"
            >
              {s}
            </a>
          ))}
        </div>
      </section>

      {/* ABOUT THE TOUR */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <div className="h-px flex-1 bg-white/20" />
            <h2 className="font-serif text-3xl md:text-5xl tracking-wide text-white/80 uppercase">About the Journey</h2>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid md:grid-cols-2 gap-12 md:gap-20 mb-24">
            <div>
              <p className="text-white/70 leading-relaxed mb-6 max-w-md">
                We've shaped a seven-day private itinerary that strings together the
                soul of Portugal — three iconic regions, a dozen quiet detours.
                <br /><br />
                <span className="text-gold">Lisboa, Sintra and the Atlantic coast.</span>
              </p>
            </div>
            <div>
              <p className="text-white/60 leading-relaxed mb-6 max-w-md">
                You won't worry about routes, schedules, or queues — everything is
                arranged. We'll tell you where to wander, what to taste, and where
                the light falls best, so you can{" "}
                <span className="text-gold">simply live the days.</span>
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative pl-6 md:pl-0">
            <div className="absolute md:left-1/2 left-2 top-0 bottom-0 w-px bg-white/15" />
            <div className="space-y-20 md:space-y-32">
              {itinerary.map((row, i) => (
                <div key={row.days} className="relative grid md:grid-cols-2 gap-10 items-center">
                  {/* dot */}
                  <div className="absolute md:left-1/2 left-2 -translate-x-1/2 w-3 h-3 rounded-full bg-gold ring-4 ring-[#0b0b09]" />

                  <div className={i % 2 === 0 ? "md:pr-16 md:text-right" : "md:order-2 md:pl-16"}>
                    <p className="font-mono text-xs tracking-widest text-white/40 mb-3">{row.days}</p>
                    <h3 className="font-serif italic text-3xl md:text-4xl text-white mb-4">{row.place}</h3>
                    <p className="text-white/60 leading-relaxed max-w-md md:max-w-none md:inline-block">{row.body}</p>
                  </div>

                  <div className={`flex gap-4 ${i % 2 === 0 ? "md:pl-16" : "md:order-1 md:pr-16 md:justify-end"}`}>
                    {row.imgs.map((src, j) => (
                      <img
                        key={j}
                        src={src}
                        alt={row.place}
                        loading="lazy"
                        className={`rounded-xl object-cover shadow-2xl ${
                          j === 0 ? "w-44 md:w-56 aspect-[3/4]" : "w-32 md:w-44 aspect-square mt-12"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="font-serif text-3xl md:text-5xl tracking-wide text-white/80 uppercase">What's Included</h2>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {included.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/15 p-6 bg-white/[0.02] hover:border-gold/60 hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg border border-white/15 grid place-items-center mb-5 text-lg">
                  {c.icon}
                </div>
                <h3 className="font-serif text-2xl mb-3 text-white">{c.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form over image */}
      <section className="relative py-24 md:py-32 px-6 md:px-10 overflow-hidden">
        <img
          src={sintraImg}
          alt="Sintra palace in mist"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-md bg-white/8 backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-10">
            <h2 className="font-serif text-3xl md:text-4xl text-white leading-tight mb-2">
              Wish to join us,
            </h2>
            <p className="font-serif italic text-3xl md:text-4xl text-gold mb-8">but still have questions?</p>

            <p className="eyebrow text-white/60 mb-6">Leave a request</p>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <input
                placeholder="Your name"
                className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold"
              />
              <input
                placeholder="Phone or email"
                className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold"
              />
              <textarea
                placeholder="Tell us about your trip"
                rows={2}
                className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold resize-none"
              />
              <button
                type="submit"
                className="w-full mt-4 py-4 rounded-full bg-white text-ink eyebrow font-medium hover:bg-gold transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Fleet philosophy */}
      <section className="bg-[#0b0b09] py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <img src={vanImg} alt="Mercedes V-Class interior" loading="lazy" className="w-full aspect-square rounded-3xl object-cover" />
            <div className="absolute -bottom-6 -right-4 md:-bottom-10 md:-right-10 w-44 md:w-60 aspect-square bg-gold p-6 md:p-8 rounded-2xl flex flex-col justify-end shadow-2xl">
              <span className="text-[40px] font-serif italic leading-none text-ink mb-2">01.</span>
              <p className="text-[10px] uppercase tracking-widest font-medium text-ink">The Quiet Fleet</p>
            </div>
          </div>
          <div>
            <p className="eyebrow text-gold mb-4">Bem-vindo</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-8 leading-tight text-white">
              Luxury, the
              <br />
              <span className="italic text-gold">Portuguese way.</span>
            </h2>
            <p className="text-white/60 mb-10 leading-relaxed">
              Saudade — that untranslatable Portuguese longing — guides every detail.
              Quiet electric tuk-tuks for the old cobblestones. Chauffeured Mercedes
              for the long coastal days. Always private, always paced for the moment.
            </p>
            <ul className="space-y-5">
              {[
                "Native Lisboeta guides — English, FR, ES, DE",
                "Door-to-door pickup, anywhere in Lisboa",
                "Vineyard, vineyard-cellar & chef extensions",
                "Skip-the-line at every monument we visit",
              ].map((item) => (
                <li key={item} className="flex items-center gap-4 group">
                  <div className="w-8 h-px bg-gold group-hover:w-14 transition-all" />
                  <span className="eyebrow text-white/80">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
