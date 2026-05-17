import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Concierge — Lusitano Lisbon Tours" },
      {
        name: "description",
        content:
          "Plan a private tour or custom itinerary. Reach our Lisbon concierge by form, email, or WhatsApp.",
      },
      { property: "og:title", content: "Contact Lusitano" },
      { property: "og:description", content: "Speak with a Lisbon concierge." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />

      <section className="pt-40 pb-20 px-6 md:px-10 max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
        <div>
          <p className="eyebrow text-gold mb-4">Concierge</p>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-8 text-balance">
            Tell us what
            <br />
            <span className="italic">you'd love to see.</span>
          </h1>
          <p className="text-ink/60 leading-relaxed mb-10 max-w-md">
            We answer every inquiry personally within a few hours — typically with a tailored
            itinerary draft and availability for your dates.
          </p>
          <div className="space-y-5">
            <ContactRow label="WhatsApp" value="+351 912 345 678" href="https://wa.me/351912345678" />
            <ContactRow label="Email" value="concierge@lusitano.pt" href="mailto:concierge@lusitano.pt" />
            <ContactRow label="Office" value="Largo da Graça 12, 1100-265 Lisboa" />
            <ContactRow label="Emergency 24h" value="+351 912 999 000" href="tel:+351912999000" />
          </div>
        </div>

        <div>
          {sent ? (
            <div className="bg-ink text-paper p-12 rounded-3xl text-center">
              <p className="text-gold eyebrow mb-4">Received</p>
              <h2 className="font-serif text-3xl mb-4">Thank you — we'll be in touch.</h2>
              <p className="text-paper/60">
                A member of the concierge team will reply within a few hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
              className="bg-white border border-ink/5 rounded-3xl p-8 md:p-10 space-y-5 shadow-sm"
            >
              <Field label="Name">
                <input required className="form-input" placeholder="Your name" />
              </Field>
              <Field label="Email">
                <input required type="email" className="form-input" placeholder="you@email.com" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input type="date" className="form-input" />
                </Field>
                <Field label="Guests">
                  <select className="form-input">
                    <option>2</option>
                    <option>3</option>
                    <option>4</option>
                    <option>5+</option>
                  </select>
                </Field>
              </div>
              <Field label="Tell us what you have in mind">
                <textarea
                  rows={5}
                  className="form-input resize-none"
                  placeholder="A sunset tour, a Sintra day, a custom itinerary…"
                />
              </Field>
              <button
                type="submit"
                className="w-full bg-ink text-paper py-4 rounded-xl eyebrow font-medium hover:bg-gold hover:text-ink transition-colors"
              >
                Send Inquiry
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="h-[400px] bg-secondary border-t border-ink/5">
        <iframe
          title="Lusitano office on map"
          src="https://www.openstreetmap.org/export/embed.html?bbox=-9.142%2C38.712%2C-9.122%2C38.722&layer=mapnik"
          className="w-full h-full"
          loading="lazy"
        />
      </section>

      <Footer />
      <WhatsappFab />

      <style>{`
        .form-input {
          width: 100%;
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input:focus { border-color: var(--gold); }
      `}</style>
    </div>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string }) {
  const content = (
    <div className="border-b border-ink/10 pb-5 group">
      <p className="eyebrow text-ink/40 mb-1">{label}</p>
      <p className="text-lg group-hover:text-gold transition-colors">{value}</p>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow text-ink/50 block mb-2">{label}</span>
      {children}
    </label>
  );
}
