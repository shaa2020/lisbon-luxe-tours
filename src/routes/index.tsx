import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lusitano — Private Tuk-Tuk & Luxury Tours of Portugal" },
      {
        name: "description",
        content:
          "Cinematic private tours of Lisboa, Sintra, Belém, Cascais and Cabo da Roca. Electric tuk-tuks, chauffeured Mercedes, native Lisboeta guides.",
      },
      { property: "og:title", content: "Lusitano — Cinematic Private Tours of Portugal" },
      {
        property: "og:description",
        content:
          "From Alfama's azulejo-lined alleys to Sintra's mist-wreathed palaces — a quiet, private way to see Portugal.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

const quickFacts = [
  { img: alfamaImg, top: "7 districts", bottom: "across Lisboa" },
  { img: sintraImg, top: "Pena · Regaleira", bottom: "Monserrate" },
  { img: belemImg, top: "Pastéis warm", bottom: "from the oven" },
  { img: cascaisImg, top: "Sunset wine", bottom: "by the Atlantic" },
  { img: caboImg, top: "Westernmost", bottom: "tip of Europe" },
];

const itinerary = [
  {
    days: "Day 01 — 02",
    place: "Lisboa & Alfama",
    body:
      "Begin in the old Moorish quarter — fado echoing from tavernas, miradouros at golden hour, ginjinha from a chipped ceramic cup. Tram 28, São Jorge Castle, the tile museum in Madre de Deus.",
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
  {
    icon: "🛺",
    title: "Electric Tuk-Tuks",
    body: "Silent, zero-emission rides through Alfama's narrow lanes — open-air and sunset-ready.",
  },
  {
    icon: "🚐",
    title: "Mercedes V-Class",
    body: "Chauffeured executive vans for Sintra and Cascais days. Leather, climate, chilled water.",
  },
  {
    icon: "🥂",
    title: "Tastings Included",
    body: "Pastéis de nata, vinho do Porto, ginjinha and a vineyard stop on full-day itineraries.",
  },
  {
    icon: "🗝️",
    title: "Local Concierge",
    body: "A multilingual Lisboeta guide — bookings, skip-the-line, restaurant reservations.",
  },
];

const fleet = [
  {
    name: "Electric Tuk-Tuk",
    cap: "1 — 6 guests",
    range: "Lisboa centro · Alfama · Belém",
    note: "Open-air, near-silent, perfect for tight cobbled streets and miradouros.",
  },
  {
    name: "Mercedes V-Class",
    cap: "1 — 7 guests",
    range: "Sintra · Cascais · Évora · Óbidos",
    note: "Captain seats, panoramic glass roof, complimentary refreshments.",
  },
  {
    name: "Luxury SUV",
    cap: "1 — 4 guests",
    range: "Sunset Cabo da Roca · Vineyards",
    note: "Range Rover or Mercedes GLE — discreet, climate-controlled comfort.",
  },
];

const portugalEditorial = [
  {
    word: "Saudade",
    title: "The longing that defines a nation",
    body:
      "Untranslatable. A tender melancholy for what was, what could have been — and the deep love beneath it all. You'll hear it in every fado note.",
    tag: "Soul",
  },
  {
    word: "Azulejo",
    title: "Five centuries of blue and white",
    body:
      "From Moorish geometry to baroque storytelling — Lisbon's tiles cover monasteries, metro stations and the back of a corner bakery.",
    tag: "Craft",
  },
  {
    word: "Bacalhau",
    title: "365 recipes for salted cod",
    body:
      "One for every day of the year, as Portuguese say. We'll seat you at the table of a chef who treats it like the national heirloom it is.",
    tag: "Gastronomy",
  },
  {
    word: "Fado",
    title: "Lisboa sung in a minor key",
    body:
      "An intimate Alfama tasca, a single guitarra portuguesa, a voice that stops conversation. Bookings made personally for our guests.",
    tag: "Music",
  },
];

const reviews = [
  {
    name: "Sophia Bernard",
    origin: "Paris, France",
    quote:
      "An afternoon entirely our own — our guide unlocked the Alfama I'd been chasing for years. Discreet, knowledgeable, effortlessly elegant.",
    tour: "Alfama Heritage",
  },
  {
    name: "James Whitaker",
    origin: "London, UK",
    quote:
      "The Sintra day in the V-Class was flawless. They skipped every line, knew where the light would be best, and never once felt like a tourist circuit.",
    tour: "Mists of Sintra",
  },
  {
    name: "Mia Tanaka",
    origin: "Tokyo, Japan",
    quote:
      "Cabo da Roca at sunset, sparkling wine in hand. This is how Lisbon should be seen — slowly, privately, with someone who genuinely loves it.",
    tour: "Cabo Sunset",
  },
];

const press = ["CONDÉ NAST", "T MAGAZINE", "MONOCLE", "AFAR", "FORBES", "WALLPAPER*"];

const faqs = [
  {
    q: "Are your tuk-tuks really electric?",
    a: "Yes — 100% of our tuk-tuk fleet is fully electric, charged with green energy. Silent through Alfama's alleys and zero local emissions.",
  },
  {
    q: "Will you pick us up from our hotel?",
    a: "Always. Every experience includes door-to-door pick-up and drop-off anywhere in central Lisboa. Sintra and Cascais tours include suburban pickups too.",
  },
  {
    q: "Can we customise the itinerary?",
    a: "Absolutely — most guests pick a signature route then add a private vineyard, a rooftop dinner, or a specific viewpoint. Tell your concierge at booking.",
  },
  {
    q: "What languages do your guides speak?",
    a: "Native English and Portuguese always. French, Spanish, German and Italian available on request — please flag at booking so we can match you.",
  },
  {
    q: "How far in advance should we book?",
    a: "Sintra full-day and sunset itineraries fill fastest — three to six weeks ahead in high season (May–October). Tuk-tuk mornings are often available within 48 hours.",
  },
  {
    q: "Is gratuity included?",
    a: "Never required, always appreciated. If your guide and chauffeur made the day, 10% is the local standard. We can include it on your invoice if preferred.",
  },
];

function Index() {
  const featured = tours.filter((t) => t.featured);

  return (
    <div className="min-h-screen bg-[#0b0b09] text-white selection:bg-gold/30 selection:text-white overflow-x-hidden">
      <Nav overlay />

      {/* ───────── HERO ───────── */}
      <section className="relative min-h-[100svh] flex flex-col justify-end overflow-hidden bg-black">
        <img
          src={heroImg}
          alt="Lisboa rooftops at golden hour with the Tagus river"
          width={1920}
          height={1088}
          className="absolute inset-0 w-full h-full object-cover opacity-80 animate-[scale-in_1.8s_var(--ease-out-expo)]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/90" />
        {/* subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

        {/* eyebrow + coords */}
        <div className="absolute top-28 left-0 right-0 z-10 px-6 md:px-10 flex flex-col md:flex-row justify-between items-start md:items-center text-white/70 animate-[fade-in_1.2s_var(--ease-out-expo)_0.3s_both]">
          <p className="eyebrow text-gold-muted">Est. 2012 · Lisboa</p>
          <p className="eyebrow hidden md:block">38°43′N · 9°08′W</p>
        </div>

        {/* oversized PORTUGAL wordmark */}
        <div className="relative z-10 px-4 pt-40 md:pt-44 text-center animate-[fade-up_1.1s_var(--ease-out-expo)_both]">
          <p className="eyebrow text-gold-muted mb-5">Lisboa · Sintra · Cascais · Belém</p>
          <h1
            className="font-serif italic text-white/95 leading-[0.82] tracking-[-0.04em] mx-auto"
            style={{ fontSize: "clamp(76px, 19vw, 300px)" }}
          >
            Portugal
          </h1>
          <p className="mt-6 font-serif italic text-xl md:text-2xl text-white/70 max-w-xl mx-auto">
            Seven days. Three regions. <span className="text-gold">A thousand small enchantments.</span>
          </p>
        </div>

        {/* facts strip + book card */}
        <div className="relative z-10 px-4 md:px-10 pb-12 md:pb-16 mt-14 md:mt-20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-end">
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {quickFacts.map((f, i) => (
                <div
                  key={i}
                  className="relative aspect-[3/4] rounded-xl overflow-hidden ring-1 ring-white/15 group cursor-pointer animate-[fade-up_1s_var(--ease-out-expo)_both]"
                  style={{ animationDelay: `${0.4 + i * 0.08}s` }}
                >
                  <img
                    src={f.img}
                    alt={f.top}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-3 text-[11px] leading-tight text-white">
                    <div>{f.top}</div>
                    <div className="text-white/70">{f.bottom}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link
              to="/tours"
              className="lg:w-64 w-full text-center px-10 py-5 rounded-full border border-gold/60 bg-white/5 backdrop-blur-md text-white eyebrow hover:bg-gold hover:text-ink hover:border-gold transition-colors"
            >
              Book a Journey
            </Link>
          </div>
        </div>

        {/* social rail */}
        <div className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 flex-col gap-3">
          {["IG", "FB", "TG"].map((s) => (
            <a
              key={s}
              href="#"
              aria-label={s}
              className="w-10 h-10 rounded-full border border-white/20 grid place-items-center text-[10px] tracking-widest text-white/70 hover:bg-gold hover:text-ink hover:border-gold transition"
            >
              {s}
            </a>
          ))}
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 hidden md:flex flex-col items-center gap-2 text-white/40">
          <span className="eyebrow text-[9px]">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-gold/60 to-transparent" />
        </div>
      </section>

      {/* ───────── MARQUEE ───────── */}
      <section className="border-y border-white/10 bg-black/40 py-6 overflow-hidden">
        <div className="flex gap-12 whitespace-nowrap animate-[marquee_40s_linear_infinite] font-serif italic text-3xl md:text-5xl text-white/30">
          {[
            "Lisboa", "·", "Sintra", "·", "Belém", "·", "Cascais", "·", "Cabo da Roca",
            "·", "Alfama", "·", "Saudade", "·", "Fado", "·", "Azulejo", "·", "Bacalhau",
            "·", "Vinho do Porto", "·", "Pastéis", "·", "Tram 28", "·",
          ].concat([
            "Lisboa", "·", "Sintra", "·", "Belém", "·", "Cascais", "·", "Cabo da Roca",
            "·", "Alfama", "·", "Saudade", "·", "Fado", "·", "Azulejo", "·", "Bacalhau",
            "·", "Vinho do Porto", "·", "Pastéis", "·", "Tram 28", "·",
          ]).map((w, i) => (
            <span key={i} className={w === "·" ? "text-gold/50" : ""}>{w}</span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </section>

      {/* ───────── ABOUT THE JOURNEY + TIMELINE ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <div className="h-px flex-1 bg-white/20" />
            <h2 className="font-serif text-3xl md:text-5xl tracking-[0.15em] text-white/80 uppercase">
              About the Journey
            </h2>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid md:grid-cols-12 gap-12 md:gap-16 mb-24 md:mb-32">
            <div className="md:col-span-5">
              <p className="eyebrow text-gold mb-5">A signature itinerary</p>
              <p className="font-serif italic text-3xl md:text-4xl leading-tight text-white/90 mb-6">
                Seven days that string together the soul of Portugal.
              </p>
              <p className="text-white/60 leading-relaxed">
                Three iconic regions, a dozen quiet detours.{" "}
                <span className="text-gold">Lisboa, Sintra, and the Atlantic coast.</span>
              </p>
            </div>
            <div className="md:col-span-5 md:col-start-8">
              <p className="text-white/60 leading-relaxed mb-6">
                You won't worry about routes, schedules or queues — everything is arranged.
                We'll tell you where to wander, what to taste, and where the light falls best,
                so you can <span className="text-gold">simply live the days.</span>
              </p>
              <ul className="space-y-3 text-sm text-white/70 mt-8">
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Group size</span><span className="text-white">Private only · 1–7</span></li>
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Languages</span><span className="text-white">EN · PT · FR · ES · DE</span></li>
                <li className="flex justify-between border-b border-white/10 pb-2"><span>Best season</span><span className="text-white">Apr — Oct</span></li>
                <li className="flex justify-between"><span>From</span><span className="text-gold">€450 / day</span></li>
              </ul>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute md:left-1/2 left-2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
            <div className="space-y-20 md:space-y-32">
              {itinerary.map((row, i) => (
                <div key={row.days} className="relative grid md:grid-cols-2 gap-10 items-center">
                  <div className="absolute md:left-1/2 left-2 -translate-x-1/2 w-3 h-3 rounded-full bg-gold ring-4 ring-[#0b0b09] shadow-[0_0_24px_rgba(184,155,94,0.6)]" />

                  <div className={i % 2 === 0 ? "md:pr-16 md:text-right pl-10 md:pl-0" : "md:order-2 md:pl-16 pl-10"}>
                    <p className="font-mono text-xs tracking-widest text-gold/70 mb-3">{row.days}</p>
                    <h3 className="font-serif italic text-3xl md:text-5xl text-white mb-4 leading-tight">{row.place}</h3>
                    <p className="text-white/60 leading-relaxed max-w-md md:max-w-none md:inline-block">{row.body}</p>
                  </div>

                  <div className={`flex gap-4 pl-10 md:pl-0 ${i % 2 === 0 ? "md:pl-16" : "md:order-1 md:pr-16 md:justify-end"}`}>
                    {row.imgs.map((src, j) => (
                      <img
                        key={j}
                        src={src}
                        alt={row.place}
                        loading="lazy"
                        className={`rounded-xl object-cover shadow-2xl ring-1 ring-white/10 ${
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

      {/* ───────── WHAT'S INCLUDED ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="font-serif text-3xl md:text-5xl tracking-[0.15em] text-white/80 uppercase">
              What's Included
            </h2>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {included.map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/15 p-7 bg-white/[0.02] hover:border-gold/60 hover:bg-white/[0.04] transition-all hover:-translate-y-1 duration-500"
              >
                <div className="w-11 h-11 rounded-lg border border-white/15 grid place-items-center mb-6 text-lg bg-gold/10">
                  {c.icon}
                </div>
                <h3 className="font-serif text-2xl mb-3 text-white">{c.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FEATURED COLLECTIONS ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="eyebrow text-gold mb-4">Signature Experiences</p>
              <h2 className="font-serif text-4xl md:text-6xl italic text-white leading-[0.95] max-w-2xl">
                Curated by people who grew up on these hills.
              </h2>
            </div>
            <Link to="/tours" className="eyebrow text-gold border-b border-gold/50 pb-1 hover:text-white transition-colors self-start md:self-end">
              View all experiences →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featured.map((t, i) => (
              <Link
                key={t.slug}
                to="/tours/$slug"
                params={{ slug: t.slug }}
                className={`group relative block rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 ${i === 1 ? "md:translate-y-10" : ""}`}
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.2s]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />

                  <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                    <span className="eyebrow bg-white/10 backdrop-blur-md text-white px-3 py-1.5 rounded-full">{t.tagline}</span>
                    <span className="eyebrow text-white/80">{t.duration}</span>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-7">
                    <p className="eyebrow text-gold mb-3">{t.category}</p>
                    <h3 className="font-serif italic text-3xl text-white mb-4 leading-tight">{t.title}</h3>
                    <div className="flex justify-between items-end pt-4 border-t border-white/15">
                      <span className="text-white/70 text-xs">from</span>
                      <span className="font-serif text-2xl text-gold">€{t.priceFrom}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── THE FLEET ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-12 gap-12 items-end mb-16">
            <div className="md:col-span-7">
              <p className="eyebrow text-gold mb-4">The Quiet Fleet</p>
              <h2 className="font-serif text-4xl md:text-6xl text-white leading-[0.95]">
                Three vehicles, <span className="italic text-gold">one philosophy.</span>
              </h2>
            </div>
            <p className="md:col-span-5 text-white/60 leading-relaxed">
              Every car and tuk-tuk in our garage is privately owned, immaculately
              maintained, and matched to the rhythm of the journey ahead.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {fleet.map((v, i) => (
              <div
                key={v.name}
                className="group relative rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-br from-white/[0.03] to-transparent hover:border-gold/40 transition-all"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src={vanImg}
                    alt={v.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-7">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="font-mono text-xs text-gold/70">0{i + 1} / 03</p>
                    <p className="eyebrow text-white/40">{v.cap}</p>
                  </div>
                  <h3 className="font-serif text-3xl text-white mb-3">{v.name}</h3>
                  <p className="text-sm text-white/55 leading-relaxed mb-5">{v.note}</p>
                  <p className="text-xs text-white/40 pt-4 border-t border-white/10">
                    <span className="text-gold/80">Best for</span> · {v.range}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── AUTHENTIC PORTUGAL — editorial ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <p className="eyebrow text-gold mb-4">Cultura Portuguesa</p>
            <h2 className="font-serif text-4xl md:text-6xl text-white leading-tight max-w-3xl mx-auto">
              Four words that <span className="italic text-gold">explain everything.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {portugalEditorial.map((c, i) => (
              <article
                key={c.word}
                className="relative rounded-2xl border border-white/10 p-8 md:p-10 bg-gradient-to-br from-white/[0.03] to-transparent hover:border-gold/40 transition-colors overflow-hidden"
              >
                <span className="absolute -top-6 -right-2 font-serif italic text-[140px] text-white/[0.04] select-none leading-none">
                  0{i + 1}
                </span>
                <p className="eyebrow text-gold/80 mb-6">{c.tag}</p>
                <h3 className="font-serif italic text-5xl md:text-6xl text-white mb-4 leading-none">{c.word}</h3>
                <p className="font-serif text-xl text-white/80 mb-4">{c.title}</p>
                <p className="text-white/55 leading-relaxed text-sm max-w-md">{c.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── BY THE NUMBERS ───────── */}
      <section className="py-20 md:py-24 px-6 md:px-10 border-y border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 md:gap-6">
          {[
            { n: "12+", l: "Years guiding Lisboa" },
            { n: "9,400", l: "Private journeys" },
            { n: "4.97", l: "★ across 2,100 reviews" },
            { n: "100%", l: "Electric tuk-tuk fleet" },
          ].map((s) => (
            <div key={s.l} className="text-center md:text-left">
              <p className="font-serif italic text-5xl md:text-7xl text-gold leading-none mb-3">{s.n}</p>
              <p className="eyebrow text-white/60">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── INQUIRY FORM OVER IMAGE ───────── */}
      <section className="relative py-24 md:py-32 px-6 md:px-10 overflow-hidden">
        <img
          src={sintraImg}
          alt="Sintra palace in mist"
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />

        <div className="relative max-w-7xl mx-auto">
          <div className="max-w-md bg-white/[0.08] backdrop-blur-xl border border-white/15 rounded-3xl p-8 md:p-10 shadow-2xl">
            <p className="eyebrow text-gold mb-4">Concierge</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white leading-tight mb-2">
              Wish to join us,
            </h2>
            <p className="font-serif italic text-3xl md:text-4xl text-gold mb-8">
              but still have questions?
            </p>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              <input placeholder="Your name" className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold transition-colors" />
              <input placeholder="Phone or email" className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold transition-colors" />
              <textarea
                placeholder="Tell us about your trip"
                rows={2}
                className="w-full bg-transparent border-b border-white/30 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-gold transition-colors resize-none"
              />
              <button
                type="submit"
                className="w-full mt-4 py-4 rounded-full bg-white text-ink eyebrow font-medium hover:bg-gold transition-colors"
              >
                Send Request
              </button>
              <p className="eyebrow text-white/40 text-center pt-2">We reply within 4 hours</p>
            </form>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-6 mb-16">
            <h2 className="font-serif text-3xl md:text-5xl tracking-[0.15em] text-white/80 uppercase">
              From our guests
            </h2>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((r) => (
              <figure
                key={r.name}
                className="rounded-2xl border border-white/10 p-8 bg-white/[0.02] flex flex-col"
              >
                <div className="text-gold text-lg mb-5 tracking-widest">★★★★★</div>
                <blockquote className="font-serif italic text-xl text-white/85 leading-snug mb-6 flex-1">
                  "{r.quote}"
                </blockquote>
                <figcaption className="pt-5 border-t border-white/10">
                  <p className="text-sm text-white">{r.name}</p>
                  <p className="text-xs text-white/50 mt-1">{r.origin} · {r.tour}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── PRESS ───────── */}
      <section className="py-12 md:py-16 px-6 md:px-10 border-y border-white/10 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-10 gap-y-4">
          <p className="eyebrow text-gold w-full md:w-auto md:mr-6">As featured in</p>
          {press.map((p) => (
            <span key={p} className="font-serif text-sm md:text-base tracking-[0.25em] text-white/40 hover:text-white/80 transition-colors">
              {p}
            </span>
          ))}
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10 bg-[#0b0b09]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="eyebrow text-gold mb-4">Frequently asked</p>
            <h2 className="font-serif text-4xl md:text-6xl text-white">
              Considered <span className="italic">answers.</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details
                key={f.q}
                className="group border border-white/10 rounded-2xl p-6 md:p-7 open:bg-white/[0.04] hover:border-white/20 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none gap-6">
                  <span className="flex items-baseline gap-5">
                    <span className="font-mono text-xs text-gold/60">0{i + 1}</span>
                    <span className="font-serif text-xl md:text-2xl text-white">{f.q}</span>
                  </span>
                  <span className="text-gold text-2xl transition-transform group-open:rotate-45 shrink-0">+</span>
                </summary>
                <p className="mt-5 pl-11 text-white/65 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
