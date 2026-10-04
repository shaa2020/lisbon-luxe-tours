import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const URL = "https://tuktuk24lisbon.com/book-direct";

const FAQS: LandingFaq[] = [
  {
    q: "Is it cheaper to book a Lisbon tuk-tuk tour directly?",
    a: "Booking platforms add their own fees and commission on top of the tour. When you book with TukTuk24 directly there is no agency booking fee — you pay the operator price.",
  },
  {
    q: "Do I have to pay everything upfront?",
    a: "No. You can pay in full, or reserve with a deposit (as little as 20%) and pay the rest to your driver on the day by cash or card.",
  },
  {
    q: "Can I talk to my driver before the tour?",
    a: "Yes. You get a private My Tour page with your driver's name and contact, the meeting point on a map, and direct WhatsApp support — no call centre in between.",
  },
  {
    q: "Is the tour private?",
    a: "Always. The tuk-tuk and driver are for your group only, and the route can be adjusted as you go.",
  },
  {
    q: "Can you pick us up at our hotel or the cruise terminal?",
    a: "Yes. Choose hotel pick-up at checkout or select one of our meeting points, including the Lisbon cruise terminals.",
  },
];

export const Route = createFileRoute("/book-direct")({
  head: () => ({
    meta: [
      { title: "Book Lisbon Tuk Tuk Tours Direct — No Agency Fees | TukTuk24" },
      {
        name: "description",
        content:
          "Skip GetYourGuide & Viator fees. Book your private Lisbon tuk-tuk tour direct with local drivers — pay from a 20% deposit, hotel or cruise pick-up, WhatsApp support.",
      },
      { property: "og:title", content: "Book Lisbon Tuk Tuk Tours Direct — No Agency Fees" },
      {
        property: "og:description",
        content: "Private tuk-tuk tours in Lisbon with local drivers. Deposit from 20%, hotel & cruise pick-up, direct WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQS)) }],
  }),
  component: () => (
    <LandingPage
      id="lp_book_direct"
      eyebrow="Book direct & save"
      h1="Book Your Lisbon Tuk-Tuk Tour Direct"
      intro="Found us on a booking platform? Booking straight with TukTuk24 means no agency booking fee, a flexible deposit, and a direct line to the local driver who'll show you Lisbon."
      whatsappMessage="Hi TukTuk24! I'd like to book a tuk-tuk tour directly — what's available?"
      bullets={[
        "No agency booking fee",
        "Deposit from 20%",
        "Hotel & cruise pick-up",
        "Direct WhatsApp with us",
      ]}
      toursHeading="Choose your tour"
      toursSubheading="Every tour is private, with a local driver and clear per-person prices."
      sections={[
        {
          title: "Why booking direct is better",
          body: "Platforms sit between you and the people actually running the tour. Book direct and you deal with us from start to finish — your questions answered on WhatsApp, your pick-up arranged personally, and changes handled by the team who drives you.",
        },
        {
          title: "Pay the way that suits you",
          body: "Pay in full online, or secure your tour with a small deposit and settle the balance with your driver on the day by cash or card. Payments are processed securely and you receive a confirmation and private tour page instantly.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
