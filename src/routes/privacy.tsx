import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { useSiteBrand } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Tuk Tuk 24 privacy policy: how we collect, use, and protect your personal data when you book a tour or subscribe to our newsletter.",
      },
      { property: "og:title", content: "Privacy Policy — Tuk Tuk 24" },
      {
        property: "og:description",
        content: "How Tuk Tuk 24 handles your personal data and booking information.",
      },
      { property: "og:url", content: "/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { business, brandName } = useSiteBrand();
  const email = business.contactEmail;
  const address = [business.addressLine1, business.addressLine2].filter(Boolean).join(", ");
  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />
      <main className="pt-[94px] md:pt-[118px] pb-20 md:pb-28">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-gold mb-3">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-ink max-w-none">
            <p className="text-body leading-relaxed">
              {brandName} (“we”, “us”, “our”) is committed to protecting your personal data. This policy explains what information we collect, how we use it, and your rights under the General Data Protection Regulation (GDPR).
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">1. Who we are</h2>
            <p className="text-body leading-relaxed">
              Tuk Tuk 24 is a private tour operator based in Lisbon, Portugal. Our registered address is {address}. For data-protection questions, email us at{" "}
              <a href={`mailto:${email}`} className="text-gold hover:underline">{email}</a>.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">2. What data we collect</h2>
            <ul className="list-disc pl-5 text-body leading-relaxed space-y-1">
              <li><strong>Booking data:</strong> name, email, phone number, travel dates, group size, tour preferences, and payment information processed by our payment provider.</li>
              <li><strong>Newsletter data:</strong> email address if you subscribe to our newsletter.</li>
              <li><strong>Technical data:</strong> IP address, browser type, and pages visited, collected through standard server logs and cookies.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-5 text-body leading-relaxed space-y-1">
              <li>To confirm, manage, and communicate about your booking.</li>
              <li>To process payments via our secure payment provider.</li>
              <li>To send you our newsletter if you have opted in.</li>
              <li>To improve our website and services.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">4. Legal basis</h2>
            <p className="text-body leading-relaxed">
              We process your data on the basis of contract performance (bookings), consent (newsletter), and legitimate interest (customer service and fraud prevention).
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">5. Data sharing</h2>
            <p className="text-body leading-relaxed">
              We do not sell your personal data. We share it only with trusted service providers necessary to run our business: payment processors, email/WhatsApp messaging services, and website hosting.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">6. Your rights</h2>
            <p className="text-body leading-relaxed">
              You have the right to access, correct, delete, restrict, or object to the processing of your data, and to withdraw consent at any time. To exercise these rights, contact us at{" "}
              <a href={`mailto:${email}`} className="text-gold hover:underline">{email}</a>.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">7. Retention</h2>
            <p className="text-body leading-relaxed">
              We keep booking records for as long as required by Portuguese tax and travel regulations (generally 10 years). Newsletter subscriptions are kept until you unsubscribe.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">8. Changes</h2>
            <p className="text-body leading-relaxed">
              We may update this policy from time to time. The latest version will always be published on this page.
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
