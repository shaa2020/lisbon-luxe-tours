import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I book a tuk-tuk tour in Lisbon?",
    a: "You can book directly through any tour page, by using our Build Your Tour designer, on WhatsApp, or by contacting us. We reply within four hours.",
  },
  {
    q: "Are your tuk-tuks electric?",
    a: "Yes — our entire fleet is 100% electric, silent, and emission-free. Perfect for Lisbon's historic neighbourhoods like Alfama and Graça.",
  },
  {
    q: "How many people fit in one tuk-tuk?",
    a: "Each tuk-tuk seats up to 6 passengers comfortably. For larger groups we operate a fleet of luxury Mercedes vans for up to 16 guests.",
  },
  {
    q: "Do you offer hotel pick-up?",
    a: "Yes, hotel pick-up and drop-off in central Lisbon is included on every tour at no extra cost.",
  },
  {
    q: "What is your cancellation policy?",
    a: "Free cancellation up to 24 hours before the tour. For full refunds within 24 hours, please contact us — we will accommodate genuine emergencies.",
  },
  {
    q: "Do you operate in the rain?",
    a: "Yes. Our tuk-tuks are fully enclosed with side curtains and rain protection. If weather is severe, we will offer to reschedule or refund.",
  },
  {
    q: "Are the tours private?",
    a: "Every tour we run is 100% private — only your group, your guide, your itinerary. We never mix parties.",
  },
  {
    q: "Which languages do your guides speak?",
    a: "Our guides are native or fluent in English, Portuguese, Spanish, French and Italian. Other languages on request.",
  },
  {
    q: "Can I customise a tour or build my own?",
    a: "Absolutely. Use our Build Your Tour designer to pick the vehicle, duration, destinations and add-ons à la carte — you get a live total and can pay online or request a quote.",
  },
  {
    q: "Is tipping expected?",
    a: "Tipping is appreciated but never expected. 10% of the tour price is a generous gesture if you enjoyed your experience.",
  },
  {
    q: "Do you accommodate accessibility needs?",
    a: "Yes — please let us know in advance so we can pair you with the right vehicle and adjust the itinerary for step-free routes where possible.",
  },
  {
    q: "How far in advance should I book?",
    a: "We recommend booking at least 48 hours ahead in peak season (April–October). For last-minute requests, WhatsApp is your fastest channel.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — Tuk Tuk 24 Lisbon Tours" },
      {
        name: "description",
        content:
          "Answers to the most common questions about our private tuk-tuk and luxury tours in Lisbon, Sintra, Cascais and Belém.",
      },
      { property: "og:title", content: "FAQ — Tuk Tuk 24 Lisbon Tours" },
      {
        property: "og:description",
        content: "Everything you need to know before booking your Lisbon tour.",
      },
      { property: "og:url", content: "https://tuktuk24lisbon.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/faq" }],
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
  component: FAQPage,
});

function FAQPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <section className="pt-[120px] md:pt-[160px] pb-12 container-x">
        <p className="eyebrow text-gold mb-4">Frequently asked</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-ink leading-tight mb-6 max-w-3xl">
          Everything you wanted to ask
        </h1>
        <p className="text-body text-lg max-w-2xl">
          The most common questions our travellers ask before booking a private Lisbon tour. Still
          curious?{" "}
          <Link to="/contact" className="text-gold underline-offset-4 hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </section>

      <section className="container-x pb-24 md:pb-32 max-w-3xl">
        <div className="divide-y divide-border border border-border rounded-2xl bg-white overflow-hidden">
          {FAQS.map((f, i) => (
            <FAQItem key={i} question={f.q} answer={f.a} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}

function FAQItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group"
    >
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-cloud/40 transition">
        <h2 className="font-display text-lg md:text-xl font-semibold text-ink">{question}</h2>
        <ChevronDown
          className={`w-5 h-5 text-gold shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </summary>
      <div className="px-6 pb-6 text-body leading-relaxed">{answer}</div>
    </details>
  );
}
