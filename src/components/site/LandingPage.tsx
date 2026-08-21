import { Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab, WhatsappInline } from "@/components/site/Whatsapp";
import { TourCard } from "@/components/site/TourCard";
import { useTours, type Tour } from "@/lib/cms";
import { useSiteBrand } from "@/lib/brand";
import { CANCELLATION_POLICY_BULLETS } from "@/lib/cancellation";
import { trackBookingCtaClick } from "@/lib/analytics";

export type LandingFaq = { q: string; a: string };

export type LandingPageProps = {
  /** Analytics + WhatsApp context id, e.g. "lp_book_a_tour" */
  id: string;
  eyebrow: string;
  h1: string;
  intro: string;
  whatsappMessage: string;
  bullets: string[];
  /** Optional filter for which tours to feature; defaults to all. */
  filterTours?: (t: Tour) => boolean;
  toursHeading: string;
  toursSubheading: string;
  sections: { title: string; body: string }[];
  faqs: LandingFaq[];
  heroImage?: string;
};

export function LandingPage(props: LandingPageProps) {
  const { data: tours = [], isLoading } = useTours();
  const { heroImageUrl } = useSiteBrand();
  const list = props.filterTours ? tours.filter(props.filterTours) : tours;
  const shown = list.length ? list : tours;
  const bg = props.heroImage ?? heroImageUrl ?? undefined;

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav overlay />

      {/* Hero */}
      <header className="relative pt-[120px] pb-14 md:pb-20 bg-ink text-white overflow-hidden">
        {bg && (
          <img
            src={bg}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/80 via-ink/70 to-ink" />
        <div className="container-x relative">
          <p className="eyebrow text-gold mb-3">◆ {props.eyebrow}</p>
          <h1 className="font-display font-bold text-[2rem] sm:text-5xl md:text-[3.4rem] leading-[1.08] max-w-3xl text-white">
            {props.h1}
          </h1>
          <p className="mt-5 text-white/80 max-w-2xl text-[15px] md:text-base leading-relaxed">
            {props.intro}
          </p>

          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/75">
            {props.bullets.map((b) => (
              <li key={b} className="flex items-center gap-2">
                <span className="text-gold">✓</span>
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link
              to="/tours"
              onClick={() => trackBookingCtaClick(props.id + "_hero")}
              className="inline-flex items-center justify-center bg-gold text-white px-8 py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-ink transition-colors"
            >
              Book Now →
            </Link>
            <div className="sm:w-auto">
              <WhatsappInline
                location={props.id + "_hero"}
                message={props.whatsappMessage}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-[#25D366]/20 transition-colors"
              >
                WhatsApp us
              </WhatsappInline>
            </div>
          </div>
        </div>
      </header>

      {/* Tours */}
      <section className="container-x py-16 md:py-20">
        <p className="eyebrow text-gold mb-3">Choose your tour</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3 leading-tight">
          {props.toursHeading}
        </h2>
        <p className="text-body max-w-2xl mb-10">{props.toursSubheading}</p>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[340px] rounded-xl bg-white/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shown.map((t) => (
              <TourCard key={t.slug} tour={t} />
            ))}
          </div>
        )}
      </section>

      {/* Content sections */}
      <section className="bg-white border-y border-border">
        <div className="container-x py-16 md:py-20 grid grid-cols-1 md:grid-cols-2 gap-10">
          {props.sections.map((s) => (
            <article key={s.title}>
              <h2 className="font-display text-2xl font-bold mb-3 leading-snug">{s.title}</h2>
              <p className="text-body leading-relaxed text-[15px]">{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Policy */}
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

      {/* FAQ */}
      <section className="bg-white border-t border-border">
        <div className="container-x py-16">
          <h2 className="font-display text-3xl font-bold mb-8">Frequently asked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
            {props.faqs.map((f) => (
              <div key={f.q}>
                <h3 className="font-semibold text-ink mb-2">{f.q}</h3>
                <p className="text-body text-[15px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-white">
        <div className="container-x py-16 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready when you are.
          </h2>
          <p className="text-white/75 max-w-xl mx-auto mb-8">
            Pick a date, tell us how many of you there are, and we'll confirm by WhatsApp — usually
            within a few hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/tours"
              onClick={() => trackBookingCtaClick(props.id + "_footer")}
              className="inline-flex items-center justify-center bg-gold text-white px-8 py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-white hover:text-ink transition-colors"
            >
              Book Now →
            </Link>
            <WhatsappInline
              location={props.id + "_footer"}
              message={props.whatsappMessage}
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

export function faqJsonLd(faqs: LandingFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
