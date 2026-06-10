import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { useSiteBrand } from "@/lib/brand";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Concierge — Tuk Tuk 24" },
      {
        name: "description",
        content:
          "Plan a private tour or custom Portugal itinerary. Reach our Lisboa concierge by form, email, or WhatsApp — we reply within a few hours.",
      },
      { property: "og:title", content: "Contact Tuk Tuk 24" },
      { property: "og:description", content: "Speak with a Lisboa concierge." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  date: z.string().optional(),
  guests: z.string().optional(),
  message: z.string().trim().min(1, "Tell us a little about your trip").max(1000),
});

function ContactPage() {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      date: String(fd.get("date") ?? ""),
      guests: String(fd.get("guests") ?? ""),
      message: String(fd.get("message") ?? ""),
    };
    const result = contactSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = String(issue.path[0]);
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav overlay />

      {/* Page header */}
      <header className="relative pt-[120px] pb-12">
        <div className="relative h-[280px] md:h-[320px] overflow-hidden bg-ink">
          <div className="container-x relative h-full flex flex-col justify-center text-white">
            <p className="eyebrow text-gold mb-3">◆  Concierge</p>
            <h1 className="font-display font-bold text-5xl md:text-6xl mb-4 leading-[1.05]">
              Tell us what you'd love to see.
            </h1>
            <p className="text-white/80 max-w-xl">
              We answer every inquiry personally — typically with a tailored itinerary draft and
              availability for your dates within a few hours.
            </p>
          </div>
        </div>
      </header>

      <section className="container-x py-16 md:py-20 grid md:grid-cols-2 gap-12 items-start">
        {/* Contact details */}
        <div>
          <p className="eyebrow text-gold mb-3">Get in touch</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-8 leading-tight">
            Three ways to reach us.
          </h2>

          <div className="space-y-4 mb-10">
            <ContactRow
              icon={<WhatsappIco />}
              label="WhatsApp · fastest"
              value="+351 922 024 690"
              href="https://wa.me/351922024690"
            />
            <ContactRow
              icon={<MailIco />}
              label="Email"
              value="hello@tuktuk24.pt"
              href="mailto:hello@tuktuk24.pt"
            />
            <ContactRow
              icon={<PinIco />}
              label="Office"
              value="Largo da Graça 12, 1100-265 Lisboa"
            />
            <ContactRow
              icon={<PhoneIco />}
              label="Phone · Direct"
              value="+351 922 024 690"
              href="tel:+351922024690"
            />
          </div>

          <div className="rounded-2xl overflow-hidden border border-border h-[280px]">
            <iframe
              title="Tuk Tuk 24 office on map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-9.142%2C38.712%2C-9.122%2C38.722&layer=mapnik"
              className="w-full h-full"
              loading="lazy"
            />
          </div>
        </div>

        {/* Form / success */}
        <div>
          {sent ? (
            <div className="bg-gradient-to-br from-ink to-[#0f2945] text-white p-10 md:p-14 rounded-2xl text-center">
              <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold grid place-items-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2bb6f7" strokeWidth="2">
                  <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="eyebrow text-gold mb-3">Received</p>
              <h3 className="font-display text-2xl md:text-3xl font-bold mb-3">Thank you — we'll be in touch.</h3>
              <p className="text-white/70 max-w-sm mx-auto">
                A member of the concierge team will reply within a few hours with availability
                and a draft itinerary.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-white border border-border rounded-2xl p-6 md:p-8 space-y-5 shadow-[0_10px_40px_rgba(30,58,95,0.08)]"
            >
              <p className="eyebrow text-gold">Inquiry</p>
              <h3 className="font-display text-2xl font-bold text-ink !mt-1">Plan my Portugal trip</h3>

              <Field label="Name" error={errors.name}>
                <input name="name" required maxLength={100} className="form-input" placeholder="Your name" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input name="email" required type="email" maxLength={255} className="form-input" placeholder="you@email.com" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date">
                  <input name="date" type="date" className="form-input" />
                </Field>
                <Field label="Guests">
                  <select name="guests" className="form-input" defaultValue="2">
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5+">5+</option>
                  </select>
                </Field>
              </div>
              <Field label="Tell us what you have in mind" error={errors.message}>
                <textarea
                  name="message"
                  required
                  rows={5}
                  maxLength={1000}
                  className="form-input resize-none"
                  placeholder="A sunset tour, a Sintra day, a custom 4-day itinerary…"
                />
              </Field>
              <button
                type="submit"
                className="w-full bg-gold text-white py-4 rounded-full text-[12px] font-semibold uppercase tracking-widest shadow-[0_8px_20px_rgba(43,182,247,0.35)] hover:bg-ink hover:shadow-[0_8px_20px_rgba(30,58,95,0.35)] transition-all"
              >
                Send Inquiry →
              </button>
              <p className="text-[11px] text-body text-center">We typically reply within 4 hours.</p>
            </form>
          )}
        </div>
      </section>

      <Footer />
      <WhatsappFab />

      <style>{`
        .form-input {
          width: 100%;
          background: #f5f7fa;
          border: 1px solid var(--border);
          color: var(--ink);
          border-radius: 0.5rem;
          padding: 0.875rem 1rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input::placeholder { color: rgba(30, 58, 95, 0.4); }
        .form-input:focus { border-color: var(--gold); background: #ffffff; }
      `}</style>
    </div>
  );
}

function ContactRow({
  icon, label, value, href,
}: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const content = (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-border hover:border-gold transition-colors group">
      <div className="w-11 h-11 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0 group-hover:bg-gold group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">{label}</p>
        <p className="text-ink font-medium truncate">{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href}>{content}</a> : content;
}

function Field({
  label, children, error,
}: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">{label}</span>
      {children}
      {error && <span className="text-[12px] text-red-600 block mt-1.5">{error}</span>}
    </label>
  );
}

function WhatsappIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 12a8 8 0 1 1-3.6-6.7L20 4l-1.3 3.6A8 8 0 0 1 20 12Zm-8-6a6 6 0 0 0-5.1 9.2l-.8 2.3 2.3-.7A6 6 0 1 0 12 6Zm3.3 8.4c-.2.6-1.1 1.1-1.6 1.2-.4 0-1 .1-2.5-.5a8.5 8.5 0 0 1-4-3.5c-.5-.8-.8-1.6-.5-2.3.1-.3.5-.8 1-.8.2 0 .3 0 .5.4l.6 1.4c.1.2.1.4 0 .6l-.3.4c-.1.2-.3.3-.1.6.2.3.7 1.1 1.4 1.7a5 5 0 0 0 2 1.3c.3.1.5.1.6 0l.4-.5c.2-.3.4-.2.6-.1l1.4.6c.3.2.4.3.5.4 0 .2 0 .8-.2 1.1Z"/></svg>
  );
}
function MailIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function PinIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function PhoneIco() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
