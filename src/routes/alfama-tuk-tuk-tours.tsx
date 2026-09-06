import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/alfama-tuk-tuk-tours";

const FAQS: LandingFaq[] = [
  {
    q: "Why see Alfama by tuk-tuk instead of walking?",
    a: "Alfama is built on a hill and almost every street is cobbled, stepped or steep. A tuk-tuk does the climbing for you, reaches the viewpoints at the top and still fits down lanes a car cannot enter.",
  },
  {
    q: "Which Alfama viewpoints do you stop at?",
    a: "The usual stops are Miradouro das Portas do Sol and Santa Luzia over the rooftops and the Tagus, plus Graça or Senhora do Monte higher up when time allows. Your driver adjusts the order to the light and the crowds.",
  },
  {
    q: "Can we get out and walk around?",
    a: "Yes. The tour is private, so you decide where to stop, how long to stay and whether to add a pastel de nata or a glass of wine along the way.",
  },
  {
    q: "How much does an Alfama tuk-tuk tour cost?",
    a: "Prices are per person with a minimum of 2 guests, and every tour on this page shows its own rate before you book. Nothing is added at checkout except hotel pick-up if you choose it.",
  },
  {
    q: "Do you pick up from hotels near Alfama?",
    a: "Yes. Hotel or apartment pick-up in central Lisbon can be added at checkout, and we drop you back where you started.",
  },
];

export const Route = createFileRoute("/alfama-tuk-tuk-tours")({
  head: () => ({
    meta: [
      { title: "Alfama Tuk Tuk Tours — Private Rides Through Old Lisbon | TukTuk24" },
      {
        name: "description",
        content:
          "Private Alfama tuk tuk tours in Lisbon: the fado quarter's lanes, Portas do Sol and Santa Luzia viewpoints, São Jorge castle hill. Local drivers, hotel pick-up.",
      },
      { property: "og:title", content: "Alfama Tuk Tuk Tours in Lisbon | TukTuk24" },
      {
        property: "og:description",
        content:
          "The oldest quarter of Lisbon, its viewpoints and its lanes — by private electric tuk-tuk with a local driver.",
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
            { "@type": "ListItem", position: 2, name: "Alfama tuk tuk tours", item: URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <LandingPage
      id="lp_alfama"
      eyebrow="Alfama"
      h1="Alfama Tuk Tuk Tours in Lisbon"
      intro="Alfama survived the 1755 earthquake, so its street plan is still medieval — narrow, stepped and steep. A private tuk-tuk takes the climbing out of it and gets you to the viewpoints most visitors give up on."
      whatsappMessage="Hi Tuk Tuk 24! I'd like a private tuk-tuk tour of Alfama — what's available?"
      bullets={[
        "Portas do Sol & Santa Luzia viewpoints",
        "No hills to climb on foot",
        "Private — your group only",
        "Hotel pick-up available",
      ]}
      filterTours={(t) =>
        /alfama|old town|historic|city|castle|fado|graça|graca/i.test(
          `${t.title} ${t.category} ${t.tagline}`,
        )
      }
      toursHeading="Tours that cover Alfama"
      toursSubheading="Every route below runs through the old quarter. Prices are per person with a minimum of 2 guests."
      sections={[
        {
          title: "What you see in Alfama",
          body: "The ride winds under the walls of São Jorge castle, past the Sé cathedral, along the lanes below Portas do Sol where laundry still hangs across the street, and up to the miradouros looking over terracotta roofs to the Tagus. Fado houses, tiny grocers and the Feira da Ladra flea market on Tuesdays and Saturdays are all within the same few blocks.",
        },
        {
          title: "Why a private tuk-tuk works here",
          body: "Tour coaches cannot enter Alfama at all, and walking it in summer heat costs you most of a day. An electric tuk-tuk is narrow enough for the lanes, quiet enough to hear your driver, and open enough to photograph as you go. Because the tour is private, you set the pace and stop wherever you like.",
        },
        {
          title: "Practical information",
          body: "Most Alfama routes take one to two hours and start in central Lisbon; hotel pick-up in the centre can be added at checkout. Cobbles are bumpy but the ride is slow, and children travel with you. Bring a light jacket for the viewpoints — the wind off the river is real even in summer.",
        },
        {
          title: "Best time to go",
          body: "Early morning gives you empty lanes and soft light on the rooftops. Late afternoon into sunset is the photographer's slot at Portas do Sol and Senhora do Monte, but it is also the busiest — your driver will pick the order of stops to keep you ahead of the crowd.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
