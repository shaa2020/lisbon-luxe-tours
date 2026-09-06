import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/cabo-da-roca-tours";

const FAQS: LandingFaq[] = [
  {
    q: "What is Cabo da Roca?",
    a: "The westernmost point of mainland Europe — a lighthouse on a cliff about 140 metres above the Atlantic, roughly 40 km from Lisbon inside the Sintra-Cascais natural park.",
  },
  {
    q: "How do you get to Cabo da Roca from Lisbon?",
    a: "There is no direct train. It is reached by road through Sintra or along the Cascais coast, which is why it is normally visited as part of a private day trip rather than on its own.",
  },
  {
    q: "How long do you stop there?",
    a: "The tour is private, so the stop is as long as you want it. Most guests spend 20 to 30 minutes at the cliff, the marker stone and the lighthouse before continuing along the coast.",
  },
  {
    q: "Can it be combined with Sintra?",
    a: "Yes, and most guests do exactly that: Sintra's palaces in the morning, Cabo da Roca in the afternoon, then the coast road back through Guincho and Cascais.",
  },
];

export const Route = createFileRoute("/cabo-da-roca-tours")({
  head: () => ({
    meta: [
      { title: "Cabo da Roca Tours from Lisbon — Europe's Westernmost Cliff | TukTuk24" },
      {
        name: "description",
        content:
          "Private Cabo da Roca tours from Lisbon: the westernmost cliff in mainland Europe, its lighthouse, and the coast road through Sintra, Guincho and Cascais.",
      },
      { property: "og:title", content: "Cabo da Roca Tours from Lisbon | TukTuk24" },
      {
        property: "og:description",
        content:
          "The cliffs at the western edge of Europe, combined with Sintra and the Cascais coast — private, from Lisbon.",
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
            { "@type": "ListItem", position: 2, name: "Cabo da Roca tours", item: URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <LandingPage
      id="lp_cabo_da_roca"
      eyebrow="Cabo da Roca"
      h1="Cabo da Roca Tours from Lisbon"
      intro="A lighthouse, a stone marker and a 140-metre drop into the Atlantic: Cabo da Roca is where mainland Europe runs out of land. It sits inside the Sintra-Cascais natural park, about 40 km from Lisbon."
      whatsappMessage="Hi Tuk Tuk 24! I'd like a private tour to Cabo da Roca from Lisbon — what's available?"
      bullets={[
        "Westernmost point of Europe",
        "Pairs with Sintra & Cascais",
        "Private — your group only",
        "Hotel pick-up from Lisbon",
      ]}
      filterTours={(t) =>
        /roca|sintra|cascais|coast|cliff|day/i.test(`${t.title} ${t.category} ${t.tagline}`)
      }
      toursHeading="Day tours reaching Cabo da Roca"
      toursSubheading="Full-day private routes out of Lisbon. Prices are per person with a minimum of 2 guests."
      sections={[
        {
          title: "What is at the cape",
          body: "A working lighthouse from 1772, a stone marker carved with the line by the poet Camões — 'where the land ends and the sea begins' — and a cliff walk with nothing between you and the Atlantic. There is a small visitor point that issues a certificate of visit, and that is deliberately all: the site is protected parkland.",
        },
        {
          title: "The route from Lisbon",
          body: "Most days run out through Sintra, over the wooded serra and down to the cape, then south along the cliff road past Guincho beach into Cascais and back to Lisbon along the Estoril seafront. It is a loop rather than an out-and-back, so you never see the same road twice.",
        },
        {
          title: "Practical information",
          body: "Bring a windproof layer — the cape is exposed and noticeably colder than the city on any day of the year. The ground near the cliff edge is uneven and unfenced in places, so keep children close. Allow a full day from Lisbon when combining with Sintra; hotel pick-up in central Lisbon can be added at checkout.",
        },
        {
          title: "When to go",
          body: "Late afternoon gives the best light on the water and, on clear days, a sunset straight into the Atlantic. Fog rolls over the serra without warning at any time of year, so if the cape is closed in, your driver will reorder the day and come back later if there is time.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
