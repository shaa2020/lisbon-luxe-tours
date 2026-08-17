import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { GuideCard } from "@/components/guide/GuideCard";
import { useGuideCategories, usePublishedGuides } from "@/lib/travel-guide";

const TITLE = "Lisbon Travel Guide — Itineraries, Tips & Day Trips | Tuk Tuk 24";
const DESCRIPTION =
  "A practical Lisbon travel guide written by local tuk-tuk drivers: itineraries, neighbourhoods, day trips, transport, prices and honest tips for your visit.";
const URL = "https://tuktuk24lisbon.com/lisbon-guide";

export const Route = createFileRoute("/lisbon-guide/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Lisbon Travel Guide",
          description: DESCRIPTION,
          url: URL,
          publisher: { "@type": "Organization", name: "Tuk Tuk 24" },
        }),
      },
    ],
  }),
  component: GuideHubPage,
});

function GuideHubPage() {
  const { data: guides = [], isLoading } = usePublishedGuides();
  const { data: categories = [] } = useGuideCategories();
  const [query, setQuery] = useState("");

  const categoryById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.excerpt.toLowerCase().includes(q) ||
        (g.quick_answer ?? "").toLowerCase().includes(q),
    );
  }, [guides, query]);

  const featured = filtered.filter((g) => g.featured).slice(0, 3);
  const featuredIds = new Set(featured.map((g) => g.id));
  const rest = filtered.filter((g) => !featuredIds.has(g.id));

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      <section className="pt-[94px] md:pt-[118px] pb-10 md:pb-14 bg-cloud/45">
        <div className="container-x">
          <p className="eyebrow text-gold mb-3">Lisbon Travel Guide</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold max-w-3xl leading-[1.02]">
            Everything you need to plan a good few days in Lisbon.
          </h1>
          <p className="text-body text-sm sm:text-base max-w-2xl mt-5 leading-relaxed">
            Written by the drivers who work these hills every day — itineraries, neighbourhoods, day
            trips, transport and the small details that make a visit easier.
          </p>

          <div className="mt-7 max-w-md">
            <label htmlFor="guide-search" className="sr-only">
              Search the Lisbon guide
            </label>
            <input
              id="guide-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: Sintra, 3 days, viewpoints…"
              className="w-full rounded-full border border-border bg-white px-5 py-3.5 text-sm outline-none focus:border-gold"
            />
          </div>
        </div>
      </section>

      {categories.length > 0 ? (
        <section className="container-x py-10 md:py-14">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">Browse by topic</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/lisbon-guide/category/$slug"
                params={{ slug: c.slug }}
                className="group rounded-xl border border-border bg-white p-5 transition-shadow hover:shadow-[0_14px_36px_rgba(30,58,95,0.1)]"
              >
                <h3 className="font-display text-lg font-bold group-hover:text-gold transition-colors">
                  {c.name}
                </h3>
                {c.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-body">{c.description}</p>
                ) : null}
                <span className="mt-3 inline-block text-[11px] uppercase tracking-widest text-gold">
                  {guides.filter((g) => g.category_id === c.id).length} articles
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {isLoading ? (
        <section className="container-x pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[320px] rounded-xl bg-cloud" />
            ))}
          </div>
        </section>
      ) : filtered.length === 0 ? (
        <section className="container-x pb-24">
          <div className="rounded-xl border border-border bg-white p-10 text-center">
            <h2 className="font-display text-2xl font-bold">
              {guides.length === 0 ? "Guides are on the way" : "Nothing matched that search"}
            </h2>
            <p className="text-body mt-2 text-sm">
              {guides.length === 0
                ? "We're writing the first articles now. In the meantime, our tours page has route ideas and timings."
                : "Try a shorter search, or browse the topics above."}
            </p>
            <Link
              to="/tours"
              className="mt-6 inline-flex items-center rounded-full bg-ink px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-gold transition-colors"
            >
              Browse tours
            </Link>
          </div>
        </section>
      ) : (
        <>
          {featured.length > 0 ? (
            <section className="container-x pb-6">
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">Start here</h2>
              <div className="grid gap-6 lg:grid-cols-3">
                {featured.map((g, i) => (
                  <div key={g.id} className={i === 0 ? "lg:col-span-2" : ""}>
                    <GuideCard
                      guide={g}
                      category={g.category_id ? categoryById[g.category_id] : undefined}
                      size={i === 0 ? "large" : "default"}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="container-x py-10 pb-24">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">All articles</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((g) => (
                <GuideCard
                  key={g.id}
                  guide={g}
                  category={g.category_id ? categoryById[g.category_id] : undefined}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <Footer />
      <WhatsappFab />
    </div>
  );
}
