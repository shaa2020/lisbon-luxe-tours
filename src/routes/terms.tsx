import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Terms and conditions for booking private tuk-tuk tours, custom tours, and airport transfers with Tuk Tuk 24 in Lisbon.",
      },
      { property: "og:title", content: "Terms & Conditions — Tuk Tuk 24" },
      {
        property: "og:description",
        content: "Booking terms, cancellation policy, and liability information for Tuk Tuk 24 tours.",
      },
      { property: "og:url", content: "/terms" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />
      <main className="pt-[94px] md:pt-[118px] pb-20 md:pb-28">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-gold mb-3">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight mb-8">
            Terms & Conditions
          </h1>

          <div className="prose prose-ink max-w-none">
            <p className="text-body leading-relaxed">
              These Terms & Conditions govern all bookings made through the Tuk Tuk 24 website. By booking a tour, you agree to the terms below.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">1. Bookings</h2>
            <p className="text-body leading-relaxed">
              All tours are private and must be booked in advance. A booking is confirmed only after full payment has been received or an explicit written confirmation has been sent by Tuk Tuk 24.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">2. Pricing</h2>
            <p className="text-body leading-relaxed">
              Prices are quoted per private group, not per person, unless otherwise stated. The maximum group size depends on the vehicle selected. Hotel pick-up and drop-off in central Lisbon is available for an additional €20 fee unless stated otherwise.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">3. Cancellation policy</h2>
            <p className="text-body leading-relaxed">
              Free cancellation up to 24 hours before your tour start time — full refund, no questions asked. Cancellations made less than 24 hours before the tour are non-refundable. If you reschedule and later cancel, refund eligibility is calculated from the original booked date and time, not the rescheduled one.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">4. Changes and rescheduling</h2>
            <p className="text-body leading-relaxed">
              Rescheduling is subject to availability. We recommend requesting changes as early as possible. If a change increases the tour price, the difference must be paid before the change is confirmed.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">5. No-shows and delays</h2>
            <p className="text-body leading-relaxed">
              If you do not show up at the agreed meeting point within 30 minutes of the scheduled time without contacting us, the tour will be considered cancelled and no refund will be issued. We will wait up to 15 minutes for late arrivals before attempting contact.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">6. Weather and safety</h2>
            <p className="text-body leading-relaxed">
              Tours run in most weather conditions. In the event of severe weather or unsafe conditions, we will offer a rescheduling option or a full refund. The final decision rests with Tuk Tuk 24.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">7. Liability</h2>
            <p className="text-body leading-relaxed">
              Tuk Tuk 24 holds valid passenger liability insurance. We are not liable for loss or damage to personal belongings, missed flights, or expenses arising from factors outside our reasonable control.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">8. Governing law</h2>
            <p className="text-body leading-relaxed">
              These terms are governed by the laws of Portugal. Any disputes will be resolved in the courts of Lisbon.
            </p>

            <p className="text-body/70 text-sm mt-8">Last updated: {new Date().toLocaleDateString("en-GB")}</p>
          </div>

          <div className="mt-12 pt-8 border-t border-border">
            <Link to="/" className="text-gold text-sm font-semibold hover:underline">← Back to home</Link>
          </div>
        </div>
      </main>
      <Footer />
      <WhatsappFab />
    </div>
  );
}
