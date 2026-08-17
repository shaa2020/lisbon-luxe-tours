import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { GuideContent } from "@/components/guide/GuideContent";
import { GuideCard } from "@/components/guide/GuideCard";
import { getGuideBySlug } from "@/lib/travel-guide.functions";
import {
  formatGuideDate,
  guideHeadings,
  parseBlocks,
  type GuideCategory,
  type GuideFaq,
  type GuideRow,
} from "@/lib/travel-guide";
import { tourPricing } from "@/lib/cms";
import { trackEvent } from "@/lib/analytics";
import { CANCELLATION_POLICY_BULLETS } from "@/lib/cancellation";

type LoaderResult = {
  guide: GuideRow;
  category: GuideCategory | null;
  faqs: GuideFaq[];
  tags: { id: string; slug: string; name: string }[];
  relatedGuides: GuideRow[];
  relatedTours: {
    id: string;
    slug: string;
    title: string;
    category: string;
    duration: string;
    price_from: number;
    sale_price: number | null;
    image_url: string | null;
    tagline: string | null;
  }[];
};

export const Route = createFileRoute("/lisbon-guide/$slug")({
  loader: async ({ params }) => {
    const result = await getGuideBySlug({ data: { slug: params.slug } });
    if (!result.guide) {
      if (result.redirect?.to_path) throw redirect({ href: result.redirect.to_path, statusCode: 301 });
      throw notFound();
    }
    return result as unknown as LoaderResult;
  },
  head: ({ params, loaderData }) => {
    const url = `https://tuktuk24lisbon.com/lisbon-guide/${params.slug}`;
    if (!loaderData?.guide) {
      return {
        meta: [{ title: "Unavailable — Lisbon Travel Guide" }, { name: "robots", content: "noindex" }],
      };
    }
    const g = loaderData.guide;
    const title = g.seo_title || `${g.title} | Tuk Tuk 24 Lisbon Guide`;
    const description = (g.meta_description || g.excerpt || "").slice(0, 158);
    const image = g.og_image || g.hero_image_url;
    const canonical = g.canonical_url || url;

    const schemas: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: g.title,
        description,
        image: image ?? undefined,
        datePublished: g.published_at ?? undefined,
        dateModified: g.content_updated_at ?? g.updated_at ?? g.published_at ?? undefined,
        author: { "@type": "Organization", name: g.author || "Tuk Tuk 24" },
        publisher: { "@type": "Organization", name: "Tuk Tuk 24" },
        mainEntityOfPage: canonical,
        inLanguage: g.locale || "en",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Lisbon Travel Guide", item: "https://tuktuk24lisbon.com/lisbon-guide" },
          ...(loaderData.category
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: loaderData.category.name,
                  item: `https://tuktuk24lisbon.com/lisbon-guide/category/${loaderData.category.slug}`,
                },
              ]
            : []),
          { "@type": "ListItem", position: loaderData.category ? 3 : 2, name: g.title, item: canonical },
        ],
      },
    ];

    if (loaderData.faqs?.length) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: loaderData.faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    }

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: g.robots || "index, follow" },
        { property: "og:title", content: g.og_title || title },
        { property: "og:description", content: g.og_description || description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
              { name: "twitter:card", content: "summary_large_image" },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: schemas.map((s) => ({
        type: "application/ld+json",
        children: JSON.stringify(s),
      })),
    };
  },
  notFoundComponent: GuideNotFound,
  errorComponent: GuideNotFound,
  component: GuideArticlePage,
});

function GuideNotFound() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Nav />
      <div className="container-x pt-[140px] pb-24 text-center">
        <h1 className="font-display text-3xl font-bold mb-3">This article isn’t available</h1>
        <p className="text-body mb-6">It may have moved or been unpublished.</p>
        <Link to="/lisbon-guide" className="text-gold font-semibold hover:text-ink transition">
          ← Back to the Lisbon guide
        </Link>
      </div>
      <Footer />
    </div>
  );
}

function GuideArticlePage() {
  const data = Route.useLoaderData();
  const { guide, category, faqs, tags, relatedGuides, relatedTours } = data;
  const blocks = parseBlocks(guide.content);
  const headings = guideHeadings(blocks);

  useEffect(() => {
    trackEvent("guide_view", {
      guide_slug: guide.slug,
      guide_title: guide.title,
      guide_category: category?.slug ?? "",
    });
  }, [guide.slug, guide.title, category?.slug]);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      <article>
        <header className="pt-[94px] md:pt-[118px] pb-8 bg-cloud/45">
          <div className="container-x max-w-4xl">
            <nav className="mb-4 text-[11px] uppercase tracking-widest text-body/70">
              <Link to="/lisbon-guide" className="hover:text-gold transition-colors">
                Lisbon guide
              </Link>
              {category ? (
                <>
                  <span className="mx-2 opacity-40">/</span>
                  <Link
                    to="/lisbon-guide/category/$slug"
                    params={{ slug: category.slug }}
                    className="hover:text-gold transition-colors"
                  >
                    {category.name}
                  </Link>
                </>
              ) : null}
            </nav>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-[1.06]">
              {guide.title}
            </h1>
            {guide.excerpt ? (
              <p className="text-body text-base max-w-2xl mt-5 leading-relaxed">{guide.excerpt}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-widest text-body/70">
              <span>{guide.author}</span>
              <span className="opacity-40">·</span>
              <span>{guide.reading_time} min read</span>
              {guide.published_at ? (
                <>
                  <span className="opacity-40">·</span>
                  <span>Updated {formatGuideDate(guide.content_updated_at ?? guide.published_at)}</span>
                </>
              ) : null}
            </div>
          </div>
        </header>

        {guide.hero_image_url ? (
          <div className="container-x max-w-5xl -mt-2 pt-8">
            <figure>
              <img
                src={guide.hero_image_url}
                alt={guide.hero_image_alt || guide.title}
                className="w-full rounded-xl object-cover max-h-[520px]"
              />
              {guide.hero_image_caption ? (
                <figcaption className="mt-2 text-xs text-body/70">{guide.hero_image_caption}</figcaption>
              ) : null}
            </figure>
          </div>
        ) : null}

        <div className="container-x max-w-6xl py-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              {guide.quick_answer ? (
                <div className="mb-10 rounded-xl border border-gold/40 bg-gold/[0.07] p-5 sm:p-6">
                  <p className="eyebrow text-gold mb-2">Short answer</p>
                  <p className="text-ink text-[16px] leading-relaxed">{guide.quick_answer}</p>
                </div>
              ) : null}

              {headings.length > 2 ? (
                <nav className="mb-10 rounded-xl border border-border bg-white p-5 lg:hidden">
                  <p className="eyebrow text-gold mb-3">In this guide</p>
                  <ul className="space-y-2">
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                        <a href={`#${h.id}`} className="text-sm text-body hover:text-gold transition-colors">
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              <GuideContent blocks={blocks} />

              {faqs.length > 0 ? (
                <section className="mt-14">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold mb-5">
                    Frequently asked questions
                  </h2>
                  <div className="divide-y divide-border rounded-xl border border-border bg-white">
                    {faqs.map((f) => (
                      <details key={f.id} className="group p-5">
                        <summary className="cursor-pointer list-none font-semibold text-ink flex items-start justify-between gap-4">
                          <span>{f.question}</span>
                          <span className="text-gold transition-transform group-open:rotate-45">+</span>
                        </summary>
                        <p className="mt-3 text-body text-[15px] leading-relaxed">{f.answer}</p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

              {tags.length > 0 ? (
                <div className="mt-10 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full bg-cloud px-3 py-1.5 text-[11px] uppercase tracking-widest text-body"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <aside className="lg:sticky lg:top-28 lg:self-start space-y-6">
              {headings.length > 2 ? (
                <nav className="hidden lg:block rounded-xl border border-border bg-white p-5">
                  <p className="eyebrow text-gold mb-3">In this guide</p>
                  <ul className="space-y-2">
                    {headings.map((h) => (
                      <li key={h.id} className={h.level === 3 ? "pl-4" : ""}>
                        <a href={`#${h.id}`} className="text-sm text-body hover:text-gold transition-colors">
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              <div className="rounded-xl bg-ink p-6 text-white">
                <p className="eyebrow text-gold mb-2">See it with us</p>
                <h3 className="font-display text-xl font-bold leading-snug">
                  Skip the hills. Ride the city with a local driver.
                </h3>
                <ul className="mt-4 space-y-2 text-sm text-white/75">
                  {CANCELLATION_POLICY_BULLETS.slice(0, 2).map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className="text-gold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/tours"
                  onClick={() =>
                    trackEvent("guide_cta_click", { guide_slug: guide.slug, cta: "sidebar_tours" })
                  }
                  className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gold px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white hover:text-ink transition-colors"
                >
                  Browse tours
                </Link>
              </div>
            </aside>
          </div>
        </div>

        {relatedTours.length > 0 ? (
          <section className="bg-cloud/45 py-14">
            <div className="container-x max-w-6xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">
                Tours that pair with this guide
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedTours.map((t) => {
                  const price = tourPricing({ priceFrom: t.price_from, salePrice: t.sale_price });
                  return (
                    <Link
                      key={t.id}
                      to="/tours/$slug"
                      params={{ slug: t.slug }}
                      onClick={() =>
                        trackEvent("guide_tour_click", { guide_slug: guide.slug, tour_slug: t.slug })
                      }
                      className="group overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-[0_18px_44px_rgba(30,58,95,0.12)]"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-cloud">
                        {t.image_url ? (
                          <img
                            src={t.image_url}
                            alt={t.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="h-full w-full bg-gradient-to-br from-ink/85 to-gold/60" />
                        )}
                      </div>
                      <div className="p-5">
                        <p className="eyebrow text-gold mb-2">
                          {t.category} · {t.duration}
                        </p>
                        <h3 className="font-display text-lg font-bold group-hover:text-gold transition-colors">
                          {t.title}
                        </h3>
                        <p className="mt-3 font-semibold text-ink">From €{price.current}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {relatedGuides.length > 0 ? (
          <section className="container-x max-w-6xl py-14 pb-24">
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">Keep reading</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedGuides.map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </div>
          </section>
        ) : null}
      </article>

      <Footer />
      <WhatsappFab />
    </div>
  );
}
