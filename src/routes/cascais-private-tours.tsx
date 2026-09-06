import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/cascais-private-tours";

const FAQS: LandingFaq[] = [
  {
    q: "How far is Cascais from Lisbon?",
    a: "About 30 km along the coast. By private vehicle it is roughly 40 minutes each way, and the drive along the Estoril seafront is part of the experience.",
  },
  {
    q: "What is there to do in Cascais?",
    a: "A working fishing harbour turned resort town: the old centre and its tiled streets, the Boca do Inferno sea cave, the beaches at Guincho and Estoril, and the Paula Rego and Condes de Castro Guimarães museums.",
  },
  {
    q: "Can we combine Cascais with Sintra or Cabo da Roca?",
    a: "Yes — the classic full-day loop is Sintra in the morning, Cabo da Roca at the cliffs, then the coast road back through Guincho and Cascais.",
  },
  {
    q: "Is this a private tour?",
    a: "Every tour we run is private to your group. Prices are per person with a minimum of 2 guests, shown in full before you book.",
  },
];

export const Route = createFileRoute("/cascais-private-tours")({
  head: () => ({
    meta: [
      { title: "Cascais Private Tours from Lisbon — Coast, Estoril & Guincho | TukTuk24" },
      {
        name: "description",
        content:
          "Private Cascais tours from Lisbon along the Estoril coast: the old fishing town, Boca do Inferno and Guincho beach. Hotel pick-up, your group only, real prices.",
      },
      { property: "og:title", content: "Cascais Private Tours from Lisbon | TukTuk24" },
      {
        property: "og:description",
        content:
          "The Estoril coast road, Cascais old town and Boca do Inferno — private, with hotel pick-up from Lisbon.",
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
            { "@type": "ListItem", position: 2, name: "Cascais private tours", item: URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <LandingPage
      id="lp_cascais"
      eyebrow="Cascais"
      h1="Private Cascais Tours from Lisbon"
      intro="Thirty kilometres of Atlantic coast separate Lisbon from Cascais, and the road that links them — through Belém, Estoril and the seafront promenade — is one of the best drives in the country."
      whatsappMessage="Hi Tuk Tuk 24! I'd like a private tour to Cascais from Lisbon — what's available?"
      bullets={[
        "Estoril coast road",
        "Cascais old town & harbour",
        "Boca do Inferno & Guincho",
        "Hotel pick-up from Lisbon",
      ]}
      filterTours={(t) =>
        /cascais|coast|estoril|guincho|sintra|roca|day/i.test(
          `${t.title} ${t.category} ${t.tagline}`,
        )
      }
      toursHeading="Coast tours reaching Cascais"
      toursSubheading="Half and full-day private trips west of Lisbon. Prices are per person with a minimum of 2 guests."
      sections={[
        {
          title: "What Cascais is like",
          body: "It began as a fishing village, became the summer retreat of the Portuguese royal family, and still has both faces: nets and painted boats in the harbour, grand villas and tiled façades in the streets behind. The old centre is small enough to walk in an hour, with the Condes de Castro Guimarães museum and the Paula Rego house both a short stroll from the marina.",
        },
        {
          title: "The coast between Lisbon and Cascais",
          body: "The route runs the length of the Marginal, with the Atlantic on one side the whole way. Estoril's casino and beaches come first, then Cascais bay. Just past town the sea has cut a cave into the cliff at Boca do Inferno, and a few kilometres further the dunes at Guincho catch the surf and the wind.",
        },
        {
          title: "Practical information",
          body: "Allow at least half a day from Lisbon; full-day routes normally add Sintra and Cabo da Roca. Hotel pick-up in central Lisbon can be added at checkout. Take a jacket — the coast is several degrees cooler and windier than the city, whatever the forecast says.",
        },
        {
          title: "Why private makes the difference",
          body: "Trains reach Cascais but not Guincho, Boca do Inferno or the Sintra hills, and coach tours stop for a fixed twenty minutes. With a private driver you decide how long you stay at each point, whether you swap a museum for a beach, and where you eat lunch.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
