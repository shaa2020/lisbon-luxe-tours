import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { tours, categories } from "@/data/tours";
import { TourCard } from "@/components/site/TourCard";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";

export const Route = createFileRoute("/tours")({
  head: () => ({
    meta: [
      { title: "All Tours — Lusitano Private Lisbon Experiences" },
      {
        name: "description",
        content:
          "Browse private tuk-tuk, Sintra, Belém, Cascais and sunset tours. Filter by category and duration.",
      },
      { property: "og:title", content: "All Tours — Lusitano" },
      {
        property: "og:description",
        content: "Curated private experiences across Lisbon and beyond.",
      },
    ],
  }),
  component: ToursPage,
});

function ToursPage() {
  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return tours.filter((t) => {
      const okCat = cat === "all" || t.categorySlug === cat;
      const okQ =
        !q ||
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.category.toLowerCase().includes(q.toLowerCase());
      return okCat && okQ;
    });
  }, [cat, q]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />

      <header className="pt-40 pb-16 px-6 md:px-10 max-w-7xl mx-auto">
        <p className="eyebrow text-gold mb-4">The Collection</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] mb-6 max-w-3xl text-balance">
          Every tour, <span className="italic">privately yours.</span>
        </h1>
        <p className="max-w-xl text-ink/60 leading-relaxed">
          Each experience below is operated for one party at a time — never shared, never rushed.
        </p>
      </header>

      <section className="px-6 md:px-10 max-w-7xl mx-auto sticky top-20 z-30 bg-paper/85 backdrop-blur-md py-6 border-y border-ink/5">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={cat === "all"} onClick={() => setCat("all")}>
              All
            </FilterChip>
            {categories.map((c) => (
              <FilterChip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
                {c.title}
              </FilterChip>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tours…"
            className="px-5 py-3 rounded-full bg-secondary border border-ink/10 focus:outline-none focus:border-gold text-sm w-full md:w-64"
          />
        </div>
      </section>

      <section className="px-6 md:px-10 max-w-7xl mx-auto py-16 md:py-24">
        {filtered.length === 0 ? (
          <p className="text-center text-ink/50 py-24">No tours match — try a different filter.</p>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {filtered.map((t) => (
              <TourCard key={t.slug} tour={t} />
            ))}
          </div>
        )}
      </section>

      <Footer />
      <WhatsappFab />
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full eyebrow font-medium transition-all border ${
        active
          ? "bg-ink text-paper border-ink"
          : "bg-transparent border-ink/15 hover:border-ink/40"
      }`}
    >
      {children}
    </button>
  );
}
