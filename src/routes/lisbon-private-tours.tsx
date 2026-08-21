import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const FAQS: LandingFaq[] = [
  {
    q: "What does 'private tour' mean?",
    a: "The tuk-tuk and the driver are yours alone. No strangers, no fixed group departure — the route and the pace are set by you and your driver on the day.",
  },
  {
    q: "Which neighbourhoods do you cover?",
    a: "Alfama, Mouraria, Graça, Baixa, Chiado, Bairro Alto, Príncipe Real and Belém. Longer tours add the Tejo waterfront and the miradouros above the old town.",
  },
  {
    q: "How many people fit in one tuk-tuk?",
    a: "Up to six adults comfortably. Larger groups travel in a convoy of two or three tuk-tuks with drivers who stay together.",
  },
  {
    q: "Do the tuk-tuks handle Lisbon's hills?",
    a: "Yes. Our vehicles are built for the steep cobbled lanes of Alfama and Graça, where coaches and most cars simply can't go.",
  },
];

export const Route = createFileRoute("/lisbon-private-tours")({
  head: () => ({
    meta: [
      { title: "Lisbon Private Tours by Tuk-Tuk — Alfama, Belém & Viewpoints" },
      {
        name: "description",
        content:
          "Private tuk-tuk tours of Lisbon with a local driver. Alfama, Belém, Bairro Alto and the best miradouros — your group only, your pace, clear per-person prices.",
      },
      { property: "og:title", content: "Lisbon Private Tuk-Tuk Tours" },
      {
        property: "og:description",
        content:
          "Alfama, Belém and the viewpoints — private tuk-tuk tours with local drivers and honest prices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://tuktuk24lisbon.com/lisbon-private-tours" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/lisbon-private-tours" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQS)) }],
  }),
  component: () => (
    <LandingPage
      id="lp_lisbon_private"
      eyebrow="Lisbon"
      h1="Private Tuk-Tuk Tours in Lisbon"
      intro="See Alfama's lanes, the Belém riverfront and the viewpoints most visitors miss — with a driver who lives here and a tuk-tuk that fits streets buses can't reach. Private to your group, always."
      whatsappMessage="Hi Tuk Tuk 24! I'm interested in a private Lisbon tour — what do you recommend?"
      bullets={[
        "Your group only",
        "Local Lisbon drivers",
        "Hotel pick-up available",
        "From 1 to 4 hours",
      ]}
      filterTours={(t) =>
        !/sintra|cascais|airport|transfer/i.test(`${t.title} ${t.category} ${t.categorySlug}`)
      }
      toursHeading="Our Lisbon city tours"
      toursSubheading="Short introductions to the city, half-day deep dives and sunset routes — all private, all with a local driver."
      sections={[
        {
          title: "Streets a coach will never reach",
          body: "Alfama, Mouraria and Graça are a maze of steep cobbled lanes, and that's exactly where Lisbon is at its best: laundry across the alleys, tiled façades, fado drifting out of doorways. A tuk-tuk gets you into all of it and back out again without a two-hour climb on foot.",
        },
        {
          title: "Built around what you want to see",
          body: "Tell your driver what matters to you — viewpoints, pastéis de nata, tile workshops, photo stops, or somewhere quiet to sit for ten minutes. Stops get added and skipped as you go. If your flight or dinner reservation sets the clock, we plan around it.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
