import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab, WhatsappInline } from "@/components/site/Whatsapp";
import { CANCELLATION_POLICY_BULLETS } from "@/lib/cancellation";
import { trackBookingCtaClick } from "@/lib/analytics";
import { useSiteBrand } from "@/lib/brand";

const FAQS = [
  {
    q: "How does the custom tour builder work?",
    a: "Choose your duration, then add the stops and extras you want. The price updates live as you build, so you always see the total before paying.",
  },
  {
    q: "Can we mix Lisbon and Sintra in one day?",
    a: "Yes, if the duration allows it. Pick a longer block and tell us the priorities — we'll flag anything that won't realistically fit.",
  },
  {
    q: "Is there a minimum group size?",
    a: "Prices are per person with a minimum of two guests. Larger groups travel in a convoy of tuk-tuks that stay together.",
  },
  {
    q: "What if I'd rather just describe what I want?",
    a: "Message us on WhatsApp with your dates, group size and interests and we'll send back a plan and a price the same day.",
  },
];

const STEPS = [
  { n: "01", t: "Pick your duration", d: "Everything starts with time — 1, 2, 3 or 4+ hours. The duration sets the base price and how many stops realistically fit." },
  { n: "02", t: "Add your stops", d: "Alfama, Belém, viewpoints, food stops, tile workshops, Sintra add-ons. Each option shows what it adds to the price." },
  { n: "03", t: "Choose extras", d: "Hotel pick-up, a photo stop package, longer breaks — add only what you actually want." },
  { n: "04", t: "Confirm and pay", d: "Pay in full or leave a 20% deposit. Your request lands with our team and we confirm the driver by WhatsApp." },
];

export const Route = createFileRoute("/build-your-own-tour")({
  head: () => ({
    meta: [
      { title: "Build Your Own Lisbon Tour — Custom Tuk-Tuk Itinerary" },
      {
        name: "description",
        content:
          "Design your own private Lisbon tuk-tuk tour: choose the duration, the stops and the extras, and see the price update live before you book.",
      },
      { property: "og:title", content: "Build Your Own Lisbon Tuk-Tuk Tour" },
      {
        property: "og:description",
        content:
          "Pick your duration, stops and extras — live pricing, private driver, confirmed by WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://tuktuk24lisbon.com/build-your-own-tour" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/build-your-own-tour" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: BuildYourOwnTourPage,
});

function BuildYourOwnTourPage() {
  const { heroImageUrl } = useSiteBrand();
  const wa = "Hi Tuk Tuk 24! I'd like to build a custom tour — here's what we have in mind:";

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav overlay />

      <header className="relative pt-[120px] pb-14 md:pb-20 bg-ink text-white overflow-hidden">
        {heroImageUrl && (
          <img src={heroImageUrl} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink" />
        <div className="container-x relative">
          <p className="eyebrow text-gold mb-3">◆ Custom</p>
          <h1 className="font-display font-bold text-[2rem] sm:text-5xl md:text-[3.4rem] leading-[1.08] max-w-3xl text-white">
            Build Your Own Lisbon Tuk-Tuk Tour
          </h1>
          <p className="mt-5 text-white/80 max-w-2xl text-[15px] md:text-base leading-relaxed">
            No fixed route, no filler stops. Choose how long you have, pick the places you actually
            want to see, and watch the price update as you go — then book it in the same flow.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link
              to="/tours/custom"
              onClick={() => trackBookingCtaClick("lp_build_own_hero")}
              className="inline-flex items-center justify-center bg-gold text-white px-8 py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-ink transition-colors"
            >
              Start building →
            </Link>
            <WhatsappInline
              location="lp_build_own_hero"
              message={wa}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-[#25D366]/20 transition-colors"
            >
              WhatsApp us
            </WhatsappInline>
          </div>
        </div>
      </header>

      <section className="container-x py-16 md:py-20">
        <p className="eyebrow text-gold mb-3">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10 leading-tight">
          Four steps from idea to confirmed booking
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="bg-white border border-border rounded-xl p-6">
              <p className="font-display text-gold text-2xl font-bold mb-3">{s.n}</p>
              <h3 className="font-semibold text-ink mb-2">{s.t}</h3>
              <p className="text-body text-[14px] leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link
            to="/tours/custom"
            onClick={() => trackBookingCtaClick("lp_build_own_steps")}
            className="inline-flex items-center justify-center bg-ink text-white px-8 py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-gold transition-colors"
          >
            Open the tour builder →
          </Link>
        </div>
      </section>

      <section className="bg-white border-y border-border">
        <div className="container-x py-16 grid grid-cols-1 md:grid-cols-2 gap-10">
          <article>
            <h2 className="font-display text-2xl font-bold mb-3">Good for groups with a plan</h2>
            <p className="text-body leading-relaxed text-[15px]">
              Families with small children, guests with limited walking, photographers chasing
              light, or anyone who has already done the standard city loop. You set the priorities
              and the driver builds the day around them.
            </p>
          </article>
          <article>
            <h2 className="font-display text-2xl font-bold mb-3">Transparent pricing</h2>
            <p className="text-body leading-relaxed text-[15px]">
              Prices are per person with a two-guest minimum, and every option shows what it adds
              before you commit. Group discounts apply automatically as your party grows, and hotel
              pick-up is a clearly listed add-on rather than a surprise on the day.
            </p>
          </article>
        </div>
      </section>

      <section className="container-x py-14">
        <h2 className="font-display text-2xl font-bold mb-5">Cancellation policy</h2>
        <ul className="space-y-2 max-w-2xl">
          {CANCELLATION_POLICY_BULLETS.map((b) => (
            <li key={b.text} className="flex gap-3 text-[15px] text-body">
              <span className={b.ok ? "text-green-600" : "text-red-600"}>{b.ok ? "✓" : "✕"}</span>
              {b.text}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border-t border-border">
        <div className="container-x py-16">
          <h2 className="font-display text-3xl font-bold mb-8">Frequently asked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-ink mb-2">{f.q}</h3>
                <p className="text-body text-[15px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="container-x py-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Start with your dates.</h2>
          <p className="text-white/75 max-w-xl mx-auto mb-8">
            Build it yourself in a couple of minutes, or send us a message and we'll draft it for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/tours/custom"
              onClick={() => trackBookingCtaClick("lp_build_own_footer")}
              className="inline-flex items-center justify-center bg-gold text-white px-8 py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-ink transition-colors"
            >
              Build my tour →
            </Link>
            <WhatsappInline
              location="lp_build_own_footer"
              message={wa}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-[#25D366]/20 transition-colors"
            >
              WhatsApp us
            </WhatsappInline>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
