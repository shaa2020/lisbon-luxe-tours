import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { GuideCard } from "@/components/guide/GuideCard";
import { getGuideCategories } from "@/lib/travel-guide.functions";
import { useGuideCategories, usePublishedGuides, type GuideCategory } from "@/lib/travel-guide";

export const Route = createFileRoute("/lisbon-guide/category/$slug")({
  loader: async ({ params }) => {
    const categories = (await getGuideCategories()) as GuideCategory[];
    const category = categories.find((c) => c.slug === params.slug);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ params, loaderData }) => {
    const c = loaderData?.category;
    const url = `https://tuktuk24lisbon.com/lisbon-guide/category/${params.slug}`;
    if (!c) {
      return {
        meta: [{ title: "Topic not found — Lisbon Travel Guide" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = c.seo_title || `${c.name} — Lisbon Travel Guide | Tuk Tuk 24`;
    const description =
      c.meta_description ||
      c.description ||
      `${c.name} articles from the Tuk Tuk 24 Lisbon travel guide, written by local drivers.`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 158) },
        { property: "og:title", content: title },
        { property: "og:description", content: description.slice(0, 158) },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(c.image_url
          ? [
              { property: "og:image", content: c.image_url },
              { name: "twitter:image", content: c.image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Lisbon Travel Guide", item: "https://tuktuk24lisbon.com/lisbon-guide" },
              { "@type": "ListItem", position: 2, name: c.name, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: CategoryNotFound,
  errorComponent: CategoryNotFound,
  component: GuideCategoryPage,
});

function CategoryNotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <div className="container-x pt-[140px] pb-24 text-center">
        <h1 className="font-display text-3xl font-bold mb-3">That topic doesn’t exist</h1>
        <Link to="/lisbon-guide" className="text-gold font-semibold hover:text-ink transition">
          ← Back to the Lisbon guide
        </Link>
      </div>
      <Footer />
    </div>
  );
}

function GuideCategoryPage() {
  const { category } = Route.useLoaderData();
  const { data: guides = [], isLoading } = usePublishedGuides();
  const { data: categories = [] } = useGuideCategories();
  const inCategory = guides.filter((g) => g.category_id === category.id);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      <section className="pt-[94px] md:pt-[118px] pb-10 md:pb-14 bg-cloud/45">
        <div className="container-x">
          <nav className="mb-4 text-[11px] uppercase tracking-widest text-body/70">
            <Link to="/lisbon-guide" className="hover:text-gold transition-colors">
              Lisbon guide
            </Link>
            <span className="mx-2 opacity-40">/</span>
            <span className="text-ink">{category.name}</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl font-bold max-w-3xl leading-[1.04]">
            {category.name}
          </h1>
          {category.description ? (
            <p className="text-body text-sm sm:text-base max-w-2xl mt-5 leading-relaxed">
              {category.description}
            </p>
          ) : null}
        </div>
      </section>

      <section className="container-x py-12 pb-24">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[320px] rounded-xl bg-cloud" />
            ))}
          </div>
        ) : inCategory.length === 0 ? (
          <div className="rounded-xl border border-border bg-white p-10 text-center">
            <h2 className="font-display text-2xl font-bold">No articles here yet</h2>
            <p className="text-body mt-2 text-sm">We’re still writing this section.</p>
            <Link
              to="/lisbon-guide"
              className="mt-6 inline-flex items-center rounded-full bg-ink px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-gold transition-colors"
            >
              Back to the guide
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {inCategory.map((g) => (
              <GuideCard key={g.id} guide={g} category={category} />
            ))}
          </div>
        )}
      </section>

      {categories.length > 1 ? (
        <section className="container-x pb-24">
          <h2 className="font-display text-xl font-bold mb-4">Other topics</h2>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.id !== category.id)
              .map((c) => (
                <Link
                  key={c.id}
                  to="/lisbon-guide/category/$slug"
                  params={{ slug: c.slug }}
                  className="rounded-full border border-border bg-white px-4 py-2 text-[12px] font-semibold text-ink hover:border-gold hover:text-gold transition-colors"
                >
                  {c.name}
                </Link>
              ))}
          </div>
        </section>
      ) : null}

      <Footer />
      <WhatsappFab />
    </div>
  );
}
