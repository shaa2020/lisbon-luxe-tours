import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/belem-tuk-tuk-tours";

const FAQS: LandingFaq[] = [
  {
    q: "What does a Belém tuk-tuk tour cover?",
    a: "The riverside run past Belém Tower, the Monument to the Discoveries, Jerónimos Monastery and the Berardo and Coach museums, with a stop for a warm pastel de nata at Pastéis de Belém.",
  },
  {
    q: "Are monument tickets included?",
    a: "Entrance tickets to Jerónimos Monastery and Belém Tower are paid separately and are not included in the tour price. Your driver will tell you which queues are worth joining and when.",
  },
  {
    q: "How long does it take?",
    a: "Belém sits about 6 km west of the centre along the river. Most routes that include it run two hours or more — the exact duration is shown on each tour below.",
  },
  {
    q: "Can we combine Belém with central Lisbon?",
    a: "Yes, that is the most popular combination: the historic centre and viewpoints first, then the river road out to Belém. Tell us at booking and the driver plans the order.",
  },
];

export const Route = createFileRoute("/belem-tuk-tuk-tours")({
  head: () => ({
    meta: [
      { title: "Belém Tuk Tuk Tours in Lisbon — Tower, Jerónimos & Pastéis | TukTuk24" },
      {
        name: "description",
        content:
          "Private Belém tuk tuk tours from central Lisbon: Belém Tower, Jerónimos Monastery, the Discoveries Monument and a stop for pastéis de Belém. Local drivers.",
      },
      { property: "og:title", content: "Belém Tuk Tuk Tours in Lisbon | TukTuk24" },
      {
        property: "og:description",
        content:
          "Belém Tower, Jerónimos Monastery and the river road — private electric tuk-tuk with a local driver.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQS)) },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://tuktuk24lisbon.com/" },
            { "@type": "ListItem", position: 2, name: "Belém tuk tuk tours", item: URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <LandingPage
      id="lp_belem"
      eyebrow="Belém"
      h1="Belém Tuk Tuk Tours from Lisbon"
      intro="Belém is where Portugal's ships left for the Atlantic, and it is still the city's grandest stretch of riverfront. It is also 6 km from the centre — a comfortable ride by tuk-tuk, a long walk on foot."
      whatsappMessage="Hi Tuk Tuk 24! I'd like a private tuk-tuk tour to Belém — what's available?"
      bullets={[
        "Belém Tower & Jerónimos",
        "Pastéis de Belém stop",
        "Riverside route from the centre",
        "Private — your group only",
      ]}
      filterTours={(t) =>
        /bel[ée]m|river|discover|monument|full|classic|city|historic/i.test(
          `${t.title} ${t.category} ${t.tagline}`,
        )
      }
      toursHeading="Tours that include Belém"
      toursSubheading="Routes running west along the Tagus. Prices are per person with a minimum of 2 guests."
      sections={[
        {
          title: "What you see in Belém",
          body: "Belém Tower and Jerónimos Monastery are both UNESCO World Heritage sites and both date from Portugal's age of discovery. Between them sit the Monument to the Discoveries on the waterfront, the Coach Museum, the Berardo modern art collection, the Belém Cultural Centre and the gardens along the river. The original pastéis de Belém bakery has been making the custard tarts since 1837.",
        },
        {
          title: "Why go by tuk-tuk",
          body: "The ride out follows the river the whole way, past Cais do Sodré, Alcântara and under the 25 de Abril bridge — a stretch that is genuinely worth seeing rather than something to endure on a bus. You are dropped at each monument instead of hunting for parking, and your driver waits while you look around.",
        },
        {
          title: "Practical information",
          body: "Monument tickets are bought separately; Jerónimos and the tower both close one day a week, so check before you plan the day around them. Queues are shortest first thing in the morning. Hotel pick-up in central Lisbon can be added at checkout.",
        },
        {
          title: "Combining Belém with the rest of the city",
          body: "Belém pairs naturally with a run through the historic centre — Alfama's viewpoints, Baixa and Chiado — as one longer private tour. If you only have a day in Lisbon, that combination covers the essentials without repeating any ground.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
