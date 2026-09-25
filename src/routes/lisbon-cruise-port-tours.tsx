import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/lisbon-cruise-port-tours";

const FAQS: LandingFaq[] = [
  {
    q: "Do you pick up at the Lisbon cruise terminal?",
    a: "Yes. We meet you right outside the terminal gate at Santa Apolónia (Lisbon Cruise Terminal) or Jardim do Tabaco, with a sign showing your name. Tell us your ship and docking time when you book and we will be there when you walk off.",
  },
  {
    q: "Will I get back to my ship on time?",
    a: "Always. We plan every shore excursion around your all-aboard time, keep a buffer before it, and drop you back at the terminal gate. Your driver tracks the clock so you never have to.",
  },
  {
    q: "How long should a shore excursion be?",
    a: "Two hours covers Alfama and the main viewpoints. Three hours adds Belém with the Tower, the Monastery and a pastel de nata stop. Half-day gives you both plus time to walk around. We build it around the hours you actually have in port.",
  },
  {
    q: "How much does a cruise port tuk-tuk tour cost?",
    a: "Prices are per person with a minimum of 2 guests, and every tour on this page shows its rate before you book. Booking direct with us means no third-party booking fee on top.",
  },
  {
    q: "Is the tour private to my group?",
    a: "Yes. You never share the tuk-tuk with strangers. Each electric tuk-tuk carries up to 6 guests, and larger groups travel in a small convoy that stays together.",
  },
  {
    q: "What if my ship arrives late?",
    a: "No problem. We follow your ship's actual arrival and adjust the start. If the port day is cancelled by the cruise line, you are not charged.",
  },
];

export const Route = createFileRoute("/lisbon-cruise-port-tours")({
  head: () => ({
    meta: [
      { title: "Lisbon Cruise Port Tours — Tuk Tuk Shore Excursions | TukTuk24" },
      {
        name: "description",
        content:
          "Private tuk-tuk shore excursions from the Lisbon cruise terminal. Pick-up at the terminal gate, Alfama, Belém and the viewpoints, guaranteed back before all-aboard.",
      },
      { property: "og:title", content: "Lisbon Cruise Port Shore Excursions by Tuk Tuk | TukTuk24" },
      {
        property: "og:description",
        content:
          "Off the ship and straight into Lisbon: private electric tuk-tuk tours from the cruise terminal, back on board in time.",
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
            { "@type": "ListItem", position: 2, name: "Lisbon cruise port tours", item: URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <LandingPage
      id="lp_cruise_port"
      eyebrow="Cruise port"
      h1="Lisbon Cruise Port Tours by Tuk Tuk"
      intro="You have a few hours in port and a hill city waiting outside the gate. We meet you at the Lisbon cruise terminal, show you the parts of Lisbon worth the time you have, and get you back on board with room to spare."
      whatsappMessage="Hi Tuk Tuk 24! My ship docks in Lisbon and I'd like a private tuk-tuk shore excursion — what's available?"
      bullets={[
        "Pick-up at the terminal gate",
        "Back before all-aboard, guaranteed",
        "Private — your group only",
        "Book direct, no agency fee",
      ]}
      filterTours={(t) =>
        /city|alfama|belém|belem|historic|old town|panoramic|highlights|castle|3 hour|2 hour/i.test(
          `${t.title} ${t.category} ${t.tagline}`,
        )
      }
      toursHeading="Shore excursions that fit a port day"
      toursSubheading="Short, private routes built for cruise passengers. Prices are per person with a minimum of 2 guests."
      sections={[
        {
          title: "Where we meet you",
          body: "Ships dock at the Lisbon Cruise Terminal at Santa Apolónia or at Jardim do Tabaco, both a few minutes from Alfama. Your driver waits outside the terminal gate with a sign showing your name, so there is no taxi queue and no walk into town. Send us your ship name and docking time when you book and we track the arrival.",
        },
        {
          title: "What you can see in two to four hours",
          body: "Two hours covers Alfama's lanes, the cathedral and the miradouros at Portas do Sol and Senhora do Monte. Three hours adds Belém — the Tower, the Jerónimos Monastery and the original pastéis de Belém. Four hours or more lets you take in both sides of the city at a walking-around pace instead of a rush.",
        },
        {
          title: "Why a tuk-tuk beats the coach excursion",
          body: "Ship excursions move fifty people at once and stop where a coach can park. An electric tuk-tuk fits down the medieval lanes a coach cannot enter, carries your group only, and changes route on the spot if you want longer somewhere. It is also quiet and open, so you hear your driver and photograph as you go.",
        },
        {
          title: "Getting back to the ship on time",
          body: "Your all-aboard time is the fixed point of the whole plan. We work backwards from it, keep a safety buffer, and return you to the terminal gate rather than the edge of the old town. If your arrival is delayed, we shift the start instead of cutting the tour short.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
