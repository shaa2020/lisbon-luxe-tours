import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { useTours, tourPricing } from "@/lib/cms";
import { useSiteBrand } from "@/lib/brand";
import { CANCELLATION_POLICY_BULLETS } from "@/lib/cancellation";

const TITLE = "Lisbon Tuk-Tuk Tour Prices — Complete Guide";
const DESCRIPTION =
  "What a tuk-tuk tour in Lisbon actually costs: our full private-tour price list, what changes the price, private vs shared, hotel pick-up fees and how to pay.";
const URL = "https://tuktuk24lisbon.com/tours/pricing-guide";

export const Route = createFileRoute("/tours/pricing-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How much does a tuk-tuk tour in Lisbon cost?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Private tuk-tuk tours in Lisbon are usually priced per tuk-tuk, not per person. Short 1–2 hour city routes start at the lower end of our price list, while half-day and full-day trips to Sintra, Belém or Cascais cost more because of distance and driver time.",
              },
            },
            {
              "@type": "Question",
              name: "Is the price per person or per tuk-tuk?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Our tours are private and priced per tuk-tuk for the whole group, so two people and four people pay the same base price for the same route.",
              },
            },
            {
              "@type": "Question",
              name: "Is hotel pick-up included?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Hotel pick-up and drop-off is optional and charged as a small flat add-on at checkout. You can also meet your driver at a central meeting point at no extra cost.",
              },
            },
            {
              "@type": "Question",
              name: "Can I cancel and get a refund?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Free cancellation up to 24 hours before the tour. Cancellations made less than 24 hours before the tour are non-refundable. If a tour has been rescheduled, the original booked date and time is used to calculate the 24-hour window.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: PricingGuidePage,
});

function PricingGuidePage() {
  const { data: tours = [], isLoading } = useTours();
  const brand = useSiteBrand();
  const pickupFee = Math.round((brand.hotelPickupFeeCents ?? 0) / 100);

  const published = tours.filter((t) => t.published !== false);
  const sorted = [...published].sort(
    (a, b) => tourPricing(a).current - tourPricing(b).current,
  );
  const cheapest = sorted.length ? tourPricing(sorted[0]!).current : null;
  const dearest = sorted.length
    ? tourPricing(sorted[sorted.length - 1]!).current
    : null;

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />
      <main className="pt-[94px] md:pt-[118px] pb-20 md:pb-28">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-gold mb-3">Pricing guide</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight mb-6">
            What a Lisbon tuk-tuk tour really costs
          </h1>
          <p className="text-body leading-relaxed text-lg">
            Most people searching for a tuk-tuk in Lisbon find a price with no
            context: is it per person or per vehicle, does it include Sintra,
            is pick-up extra? This page lays out our own prices in full, plus
            the things that actually move the number up or down.
            {cheapest && dearest ? (
              <>
                {" "}
                Today our tours run from <strong>€{cheapest}</strong> to{" "}
                <strong>€{dearest}</strong> per tuk-tuk.
              </>
            ) : null}
          </p>

          <h2 className="font-display text-2xl font-semibold text-ink mt-12 mb-4">
            Our current price list
          </h2>
          <p className="text-body leading-relaxed mb-5">
            Prices are per tuk-tuk for a private group — not per person. The
            same route costs the same whether you are two or four people.
          </p>

          {isLoading ? (
            <p className="text-body/70">Loading current prices…</p>
          ) : sorted.length === 0 ? (
            <p className="text-body/70">
              Price list is being updated —{" "}
              <Link to="/contact" className="text-gold hover:underline">
                ask us for today's prices
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink/5">
                  <tr>
                    <th className="p-3 font-semibold">Tour</th>
                    <th className="p-3 font-semibold">Duration</th>
                    <th className="p-3 font-semibold whitespace-nowrap">
                      Price (per tuk-tuk)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((tour) => {
                    const p = tourPricing(tour);
                    return (
                      <tr key={tour.slug} className="border-t border-border">
                        <td className="p-3">
                          <Link
                            to="/tours/$slug"
                            params={{ slug: tour.slug }}
                            className="text-gold font-medium hover:underline"
                          >
                            {tour.title}
                          </Link>
                        </td>
                        <td className="p-3 text-body/80">{tour.duration}</td>
                        <td className="p-3 whitespace-nowrap">
                          {p.onSale ? (
                            <>
                              <span className="line-through text-body/50 mr-2">
                                €{p.original}
                              </span>
                              <strong>€{p.current}</strong>
                            </>
                          ) : (
                            <strong>€{p.current}</strong>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <h2 className="font-display text-2xl font-semibold text-ink mt-12 mb-4">
            What changes the price
          </h2>
          <ul className="list-disc pl-5 text-body leading-relaxed space-y-2">
            <li>
              <strong>Duration.</strong> Tuk-tuk tours are sold by time. A one
              or two hour loop of Alfama costs a fraction of a full day, simply
              because the driver's day is the real cost.
            </li>
            <li>
              <strong>Distance outside Lisbon.</strong> Sintra, Cascais and
              Setúbal involve motorway driving, tolls and fuel, so they sit at
              the top of the price list. Alfama, Mouraria, Graça and Belém stay
              inside the city and stay cheaper.
            </li>
            <li>
              <strong>Number of vehicles.</strong> A tuk-tuk seats a small
              group. Larger parties need a second tuk-tuk, which doubles the
              vehicle cost — not the per-person cost.
            </li>
            <li>
              <strong>Hotel pick-up.</strong> Door-to-door pick-up and drop-off
              is optional{pickupFee ? <> and adds a flat €{pickupFee}</> : null}.
              Meeting your driver at a central point is free.
            </li>
            <li>
              <strong>Season and time of day.</strong> Sunset slots and peak
              summer weekends book out first. The price is the same, but the
              choice of times narrows, so booking early is what saves you money
              on alternatives.
            </li>
            <li>
              <strong>Entrance tickets.</strong> Monument and palace tickets
              (for example in Sintra) are paid separately at the door and are
              never included in the tour price.
            </li>
          </ul>

          <h2 className="font-display text-2xl font-semibold text-ink mt-12 mb-4">
            Private vs shared tuk-tuk tours
          </h2>
          <p className="text-body leading-relaxed">
            Shared or "hop-on" style tuk-tuk offers advertise a low per-person
            headline price, and they can work out cheaper if you are travelling
            alone. The trade-off is a fixed route, a fixed departure time and
            strangers in the vehicle.
          </p>
          <p className="text-body leading-relaxed mt-3">
            Everything we run is private. You get the whole tuk-tuk, the driver
            adapts the route to what you want to see, and you can stop for
            photos, a pastel de nata or a viewpoint whenever you like. For two
            or more people, a private tuk-tuk is usually within a few euros per
            person of a shared seat — and it's a completely different day.
          </p>

          <h2 className="font-display text-2xl font-semibold text-ink mt-12 mb-4">
            Deposits, payment and cancellation
          </h2>
          <ul className="list-disc pl-5 text-body leading-relaxed space-y-2">
            <li>
              You can pay in full at booking, or pay a deposit from 20% and
              settle the balance later — the exact amount due is shown before
              you confirm.
            </li>
            <li>
              Card and wallet payments are handled by our payment provider; no
              card details are stored by us.
            </li>
            {CANCELLATION_POLICY_BULLETS.map((b) => (
              <li key={b.text}>{b.text}</li>
            ))}
          </ul>

          <h2 className="font-display text-2xl font-semibold text-ink mt-12 mb-4">
            Getting the best value
          </h2>
          <p className="text-body leading-relaxed">
            If you have half a day, a longer city tour almost always beats two
            short ones: you skip the repeated set-up time and cover Alfama,
            Mouraria, Graça and the miradouros in one run. If you want Sintra
            and Belém, do them on separate days rather than squeezing both into
            one booking. And if none of the fixed routes fit,{" "}
            <Link to="/tours/custom" className="text-gold hover:underline">
              build a custom tour and see the price update as you choose
            </Link>
            .
          </p>

          <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-4">
            <Link
              to="/tours"
              className="text-gold text-sm font-semibold hover:underline"
            >
              See all Lisbon tours and prices →
            </Link>
            <Link
              to="/contact"
              className="text-gold text-sm font-semibold hover:underline"
            >
              Ask us about a specific route →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsappFab />
    </div>
  );
}
