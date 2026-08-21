import { createFileRoute } from "@tanstack/react-router";
import { LandingPage, faqJsonLd, type LandingFaq } from "@/components/site/LandingPage";

const FAQS: LandingFaq[] = [
  {
    q: "How do I book a tuk-tuk tour in Lisbon?",
    a: "Pick a tour, choose your date and number of guests, and pay online by card, Apple Pay, Google Pay or PayPal. You can also pay a 20% deposit and settle the rest on the day.",
  },
  {
    q: "How far in advance should I book?",
    a: "In summer we often sell out 2–3 days ahead. Off-season, same-day bookings are usually fine — message us on WhatsApp and we'll check availability straight away.",
  },
  {
    q: "Is hotel pick-up included?",
    a: "Pick-up from your hotel or apartment is an optional add-on at checkout. Otherwise we meet you at an agreed central Lisbon meeting point.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Yes — free cancellation up to 24 hours before the tour. You can also change the date, duration or guest count from the booking management link in your confirmation email.",
  },
];

export const Route = createFileRoute("/book-a-tour")({
  head: () => ({
    meta: [
      { title: "Book a Tuk-Tuk Tour in Lisbon — Instant Confirmation" },
      {
        name: "description",
        content:
          "Book a private Lisbon tuk-tuk tour online in under two minutes. Real prices per person, instant confirmation, free cancellation up to 24 hours before.",
      },
      { property: "og:title", content: "Book a Tuk-Tuk Tour in Lisbon" },
      {
        property: "og:description",
        content:
          "Private tours, local drivers, instant confirmation and free cancellation up to 24 hours before.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://tuktuk24lisbon.com/book-a-tour" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/book-a-tour" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQS)) }],
  }),
  component: () => (
    <LandingPage
      id="lp_book_a_tour"
      eyebrow="Booking"
      h1="Book a Private Tuk-Tuk Tour in Lisbon"
      intro="Choose a tour, pick your date and confirm in a couple of minutes. Prices are per person with a two-guest minimum, your driver is local, and every tour is private to your group."
      whatsappMessage="Hi Tuk Tuk 24! I'd like to book a tour — can you check availability?"
      bullets={[
        "Instant online confirmation",
        "Pay in full or 20% deposit",
        "Free cancellation 24h before",
        "Private group, local driver",
      ]}
      toursHeading="Pick the tour you want to book"
      toursSubheading="Every tour below can be booked online right now. Prices shown are per person with a minimum of two guests."
      sections={[
        {
          title: "Booking takes about two minutes",
          body: "Select a tour, choose your date and start time, tell us how many of you there are and add hotel pick-up if you want it. Pay by card, Apple Pay, Google Pay or PayPal — or leave a 20% deposit and pay the balance on the day. You get a confirmation email with your booking ID and a WhatsApp-ready contact for your driver.",
        },
        {
          title: "Flexible after you book",
          body: "Plans change. Use the booking management link in your confirmation to add guests, extend the tour or move to another date. Free cancellation applies up to 24 hours before the original start time — after that the booking is non-refundable, including for rescheduled tours where the original date counts.",
        },
      ]}
      faqs={FAQS}
    />
  ),
});
