import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Cookie policy for Tuk Tuk 24: learn what cookies we use, why we use them, and how to manage your preferences.",
      },
      { property: "og:title", content: "Cookie Policy — Tuk Tuk 24" },
      {
        property: "og:description",
        content: "How Tuk Tuk 24 uses cookies and similar technologies on its website.",
      },
      { property: "og:url", content: "/cookies" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/cookies" }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />
      <main className="pt-[94px] md:pt-[118px] pb-20 md:pb-28">
        <div className="container-x max-w-3xl">
          <p className="eyebrow text-gold mb-3">Legal</p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-ink leading-tight mb-8">
            Cookie Policy
          </h1>

          <div className="prose prose-ink max-w-none">
            <p className="text-body leading-relaxed">
              This Cookie Policy explains what cookies are, how Tuk Tuk 24 uses them, and how you can control them.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">1. What are cookies?</h2>
            <p className="text-body leading-relaxed">
              Cookies are small text files placed on your device when you visit a website. They help the site remember your preferences and improve your experience.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">2. How we use cookies</h2>
            <p className="text-body leading-relaxed">
              We use cookies for the following purposes:
            </p>
            <ul className="list-disc pl-5 text-body leading-relaxed space-y-1">
              <li><strong>Essential cookies:</strong> required for the website to function, such as maintaining your session and booking state.</li>
              <li><strong>Analytics cookies:</strong> help us understand how visitors use our site so we can improve it.</li>
              <li><strong>Preference cookies:</strong> remember your choices, such as language or currency.</li>
            </ul>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">3. Third-party cookies</h2>
            <p className="text-body leading-relaxed">
              We may use third-party services such as analytics providers and payment processors. These services may set their own cookies in accordance with their own policies.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">4. Managing cookies</h2>
            <p className="text-body leading-relaxed">
              You can manage or disable cookies through your browser settings. Please note that disabling essential cookies may prevent parts of the website from working correctly.
            </p>

            <h2 className="font-display text-xl font-semibold text-ink mt-8 mb-3">5. Changes to this policy</h2>
            <p className="text-body leading-relaxed">
              We may update this Cookie Policy from time to time. Any changes will be posted on this page.
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
