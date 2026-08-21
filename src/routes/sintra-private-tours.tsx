import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const FAQS: LandingFaq[] = [
  {
    q: "How long does a Sintra day trip take?",
    a: "Plan on a full day from Lisbon — roughly 8 hours door to door. That comfortably covers two palaces plus the historic centre, with time to eat.",
  },
  {
    q: "Are palace tickets included?",
    a: "Palace entrance tickets are paid separately and are not included in the tour price. We tell you which ones to pre-book and the best time slots to choose.",
  },
  {
    q: "Can we add Cascais or Cabo da Roca?",
    a: "Yes. The classic route pairs Sintra with Cabo da Roca — mainland Europe's westernmost point — and the Atlantic coast road back through Cascais and Estoril.",
  },
  {
    q: "Do you pick up from Lisbon hotels?",
    a: "Yes, hotel or apartment pick-up in central Lisbon can be added at checkout, and we drop you back where you started.",
  },
];

export const Route = createFileRoute("/sintra-private-tours")({
  head: () => ({
    meta: [
      { title: "Sintra Private Tours from Lisbon — Pena Palace & Cabo da Roca" },
      {
        name: "description",
        content:
          "Private Sintra day tours from Lisbon: Pena Palace, Quinta da Regaleira, the old town, Cabo da Roca and the Cascais coast road. Hotel pick-up, no fixed groups.",
      },
      { property: "og:title", content: "Sintra Private Day Tours from Lisbon" },
      {
        property: "og:description",
        content:
          "Pena Palace, Quinta da Regaleira, Cabo da Roca and Cascais — private, with hotel pick-up from Lisbon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://tuktuk24lisbon.com/sintra-private-tours" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/sintra-private-tours" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQS)) }],
  }),
  component: () => (
    <LandingPage
      id="lp_sintra_private"
      eyebrow="Sintra"
      h1="Private Sintra Tours from Lisbon"
      intro="Pena Palace, Quinta da Regaleira, the misty old town and the Atlantic cliffs at Cabo da Roca — one private vehicle, one driver, no waiting for a coach group of forty."
      whatsappMessage="Hi Tuk Tuk 24! I'd like a private Sintra day tour from Lisbon — what's available?"
      bullets={[
        "Full day from Lisbon",
        "Hotel pick-up & drop-off",
        "Private, no fixed groups",
        "Cabo da Roca & Cascais option",
      ]}
      filterTours={(t) =>
        /sintra|cascais|coast|roca/i.test(`${t.title} ${t.category} ${t.tagline}`)
      }
      toursHeading="Sintra & coast day tours"
      toursSubheading="Full-day private trips out of Lisbon. Palace tickets are booked separately — we'll tell you exactly which ones and when."
      sections={[
        {
          title: "Why go private to Sintra",
          body: "Sintra's roads are narrow and the queues are unforgiving. A private driver means you arrive at your palace slot on time, skip the shuttle bus scrum, and leave when you're ready instead of when a coach schedule says so. Between stops you get commentary from someone who drives this hill several times a week.",
        },
        {
          title: "A realistic day plan",
          body: "Most guests do Pena Palace in the morning, the historic centre and lunch around midday, then Quinta da Regaleira or Monserrate in the afternoon. If the weather turns — and in Sintra it does — we reshuffle on the spot and finish with Cabo da Roca and the coast road back through Cascais.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
