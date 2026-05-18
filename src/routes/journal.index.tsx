import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { useBlogPosts } from "@/lib/cms";

export const Route = createFileRoute("/journal/")({
  head: () => ({
    meta: [
      { title: "Journal — Saudade Travel Stories & Portugal Guides" },
      {
        name: "description",
        content:
          "Read Saudade's Portugal journal with practical guides, Lisbon tips, Sintra weekend ideas and coastal travel advice.",
      },
      { property: "og:title", content: "Journal — Saudade" },
      {
        property: "og:description",
        content: "Travel stories, local planning advice and Portugal itineraries from our concierge team.",
      },
      { property: "og:url", content: "/journal" },
    ],
    links: [{ rel: "canonical", href: "/journal" }],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { data: blogPosts = [], isLoading } = useBlogPosts();
  const featured = blogPosts[0];
  const rest = blogPosts.slice(1);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      <section className="pt-[94px] md:pt-[118px] pb-10 md:pb-14 bg-cloud/45">
        <div className="container-x">
          <p className="eyebrow text-gold mb-3">Saudade Journal</p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-ink max-w-3xl leading-[1.02]">
            Portugal stories, planning notes and local travel advice.
          </h1>
          <p className="text-body text-sm sm:text-base max-w-2xl mt-5 leading-relaxed">
            Practical guides for calmer city days, better timing, and more memorable routes across Lisbon, Sintra and the coast.
          </p>
        </div>
      </section>

      {isLoading ? (
        <section className="container-x py-16">
          <div className="animate-pulse grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="h-[320px] bg-cloud rounded-xl" />
            <div className="space-y-4 p-4">
              <div className="h-4 w-24 bg-cloud rounded" />
              <div className="h-8 w-3/4 bg-cloud rounded" />
              <div className="h-3 w-full bg-cloud rounded" />
            </div>
          </div>
        </section>
      ) : !featured ? (
        <section className="container-x py-16 text-center">
          <p className="font-display text-2xl text-ink">No stories yet.</p>
          <p className="text-body text-sm mt-2">Check back soon for new journal entries.</p>
        </section>
      ) : (
        <>
          <section className="container-x py-10 md:py-16">
            <Link
              to="/journal/$slug"
              params={{ slug: featured.slug }}
              className="grid lg:grid-cols-[1.2fr_0.8fr] overflow-hidden rounded-xl bg-white border border-border shadow-[0_10px_30px_rgba(30,58,95,0.08)]"
            >
              <div className="aspect-[16/11] lg:aspect-auto min-h-[280px]">
                <img src={featured.image} alt={featured.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center">
                <p className="eyebrow text-gold mb-3">Featured story</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight mb-4">
                  {featured.title}
                </h2>
                <p className="text-body leading-relaxed mb-6">{featured.excerpt}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] uppercase tracking-widest text-body">
                  <span>{featured.category}</span>
                  <span>{featured.date}</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
            </Link>
          </section>

          <section className="container-x pb-20 md:pb-28">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {rest.map((post) => (
                <article
                  key={post.slug}
                  className="bg-white rounded-xl overflow-hidden border border-border shadow-[0_4px_20px_rgba(30,58,95,0.06)]"
                >
                  <Link to="/journal/$slug" params={{ slug: post.slug }} className="block aspect-[16/10] overflow-hidden">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                  </Link>
                  <div className="p-6">
                    <div className="flex flex-wrap gap-3 text-[11px] text-body uppercase tracking-widest mb-3">
                      <span>{post.category}</span>
                      <span>{post.readTime}</span>
                    </div>
                    <h2 className="font-display text-2xl font-semibold text-ink leading-snug mb-3">
                      <Link to="/journal/$slug" params={{ slug: post.slug }} className="hover:text-gold transition-colors">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="text-body text-sm leading-relaxed mb-5">{post.excerpt}</p>
                    <Link
                      to="/journal/$slug"
                      params={{ slug: post.slug }}
                      className="inline-block text-[11px] font-semibold uppercase tracking-widest text-gold border-b-2 border-gold pb-1 hover:text-ink hover:border-ink transition"
                    >
                      Read more
                    </Link>
                  </div>
                </article>
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
