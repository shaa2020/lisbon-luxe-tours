import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { supabase } from "@/integrations/supabase/client";

type Faq = { id: string; question: string; answer: string };

const FALLBACK: Faq[] = [
  {
    id: "fallback-cancel",
    question: "What is your cancellation policy?",
    answer:
      "Free cancellation up to 24 hours before the tour — you get a full refund, no questions asked. Cancellations made less than 24 hours before the tour are non-refundable. If you reschedule your tour and later cancel, refund eligibility is calculated from the ORIGINAL booked date and time, not the rescheduled one. Need help? Message us on WhatsApp.",
  },
  {
    id: "fallback-book",
    question: "How do I book a tuk-tuk tour in Lisbon?",
    answer:
      "You can book directly through any tour page, by using our Build Your Tour designer, on WhatsApp, or by contacting us. We reply within four hours.",
  },
];

const faqsQuery = queryOptions({
  queryKey: ["public-faqs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("faqs" as never)
      .select("id, question, answer, sort_order, active")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Faq[];
  },
});

export const Route = createFileRoute("/faq")({
  loader: ({ context }) => context.queryClient.ensureQueryData(faqsQuery),
  head: () => ({
    meta: [
      { title: "FAQ — Tuk Tuk 24 Lisbon Tours" },
      {
        name: "description",
        content:
          "Answers to the most common questions about our private tuk-tuk and luxury tours in Lisbon, Sintra, Cascais and Belém.",
      },
      { property: "og:title", content: "FAQ — Tuk Tuk 24 Lisbon Tours" },
      {
        property: "og:description",
        content: "Everything you need to know before booking your Lisbon tour.",
      },
      { property: "og:url", content: "https://tuktuk24lisbon.com/faq" },
    ],
    links: [{ rel: "canonical", href: "https://tuktuk24lisbon.com/faq" }],
  }),
  component: FAQPage,
});

function FAQPage() {
  const { data } = useQuery(faqsQuery);
  const faqs = data && data.length > 0 ? data : FALLBACK;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }),
        }}
      />
      <section className="pt-[120px] md:pt-[160px] pb-12 container-x">
        <p className="eyebrow text-gold mb-4">Frequently asked</p>
        <h1 className="font-display text-4xl md:text-6xl font-bold text-ink leading-tight mb-6 max-w-3xl">
          Everything you wanted to ask
        </h1>
        <p className="text-body text-lg max-w-2xl">
          The most common questions our travellers ask before booking a private Lisbon tour. Still
          curious?{" "}
          <Link to="/contact" className="text-gold underline-offset-4 hover:underline">
            Get in touch
          </Link>
          .
        </p>
      </section>

      <section className="container-x pb-24 md:pb-32 max-w-3xl">
        <div className="divide-y divide-border border border-border rounded-2xl bg-white overflow-hidden">
          {faqs.map((f, i) => (
            <FAQItem key={f.id} question={f.question} answer={f.answer} defaultOpen={i === 0} />
          ))}
        </div>
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}

function FAQItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="group"
    >
      <summary className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer list-none hover:bg-cloud/40 transition">
        <h2 className="font-display text-lg md:text-xl font-semibold text-ink">{question}</h2>
        <ChevronDown
          className={`w-5 h-5 text-gold shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </summary>
      <div className="px-6 pb-6 text-body leading-relaxed whitespace-pre-wrap">{answer}</div>
    </details>
  );
}
