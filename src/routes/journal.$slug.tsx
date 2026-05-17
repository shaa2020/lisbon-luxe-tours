import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { WhatsappFab } from "@/components/site/Whatsapp";
import { blogPosts, type BlogPost } from "@/data/blog";

export const Route = createFileRoute("/journal/$slug")({
  loader: ({ params }): { post: BlogPost } => {
    const post = blogPosts.find((entry) => entry.slug === params.slug);
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.post.title} — Saudade Journal` },
          { name: "description", content: loaderData.post.excerpt },
          { property: "og:title", content: loaderData.post.title },
          { property: "og:description", content: loaderData.post.excerpt },
          { property: "og:image", content: loaderData.post.image },
          { property: "og:url", content: `/journal/${params.slug}` },
        ]
      : [],
    links: loaderData ? [{ rel: "canonical", href: `/journal/${params.slug}` }] : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="text-center max-w-md">
        <p className="eyebrow text-gold mb-4">Journal</p>
        <h1 className="font-display text-4xl font-bold text-ink mb-4">Post not found</h1>
        <p className="text-body mb-6">This story may have moved or is no longer available.</p>
        <Link to="/journal" className="text-gold font-semibold hover:text-ink transition-colors">
          ← Back to all stories
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="text-center max-w-md">
        <h1 className="font-display text-3xl font-bold text-ink mb-3">This post didn’t load</h1>
        <p className="text-body mb-6">{error.message}</p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center rounded-full bg-gold px-5 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-ink transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  ),
  component: JournalPostPage,
});

function JournalPostPage() {
  const { post } = Route.useLoaderData();
  const related = blogPosts.filter((entry) => entry.slug !== post.slug).slice(0, 2);

  return (
    <div className="min-h-screen bg-paper text-ink overflow-x-clip">
      <Nav />

      <article>
        <section className="pt-[94px] md:pt-[118px]">
          <div className="container-x pb-8 md:pb-10">
            <nav className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-body mb-5">
              <Link to="/" className="hover:text-gold transition-colors">Home</Link>
              <span>/</span>
              <Link to="/journal" className="hover:text-gold transition-colors">Journal</Link>
              <span>/</span>
              <span className="text-ink">{post.category}</span>
            </nav>

            <div className="max-w-3xl">
              <p className="eyebrow text-gold mb-3">{post.category}</p>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-ink leading-[1.02] mb-5">
                {post.title}
              </h1>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-widest text-body">
                <span>{post.date}</span>
                <span>{post.readTime}</span>
                <span>{post.comments} comments</span>
                <span>{post.shares} shares</span>
              </div>
            </div>
          </div>

          <div className="container-x">
            <div className="overflow-hidden rounded-xl border border-border shadow-[0_10px_30px_rgba(30,58,95,0.08)]">
              <img src={post.image} alt={post.title} className="w-full h-[260px] sm:h-[340px] md:h-[480px] object-cover" />
            </div>
          </div>
        </section>

        <section className="container-x py-10 md:py-14">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg md:text-xl leading-relaxed text-ink/85 mb-8">{post.excerpt}</p>
            <div className="space-y-6 text-base leading-8 text-body">
              {post.content.map((paragraph: string) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-cloud/60 py-16 md:py-20">
          <div className="container-x">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="eyebrow text-gold mb-2">Continue reading</p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">More journal stories</h2>
              </div>
              <Link to="/journal" className="text-[12px] font-semibold uppercase tracking-widest text-gold hover:text-ink transition-colors">
                All stories ›
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {related.map((entry) => (
                <article
                  key={entry.slug}
                  className="bg-white rounded-xl overflow-hidden border border-border shadow-[0_4px_20px_rgba(30,58,95,0.06)]"
                >
                  <Link to="/journal/$slug" params={{ slug: entry.slug }} className="block aspect-[16/10] overflow-hidden">
                    <img src={entry.image} alt={entry.title} className="w-full h-full object-cover" />
                  </Link>
                  <div className="p-6">
                    <p className="text-[11px] uppercase tracking-widest text-gold mb-2">{entry.category}</p>
                    <h3 className="font-display text-2xl font-semibold text-ink leading-snug mb-3">
                      <Link to="/journal/$slug" params={{ slug: entry.slug }} className="hover:text-gold transition-colors">
                        {entry.title}
                      </Link>
                    </h3>
                    <p className="text-sm text-body leading-relaxed">{entry.excerpt}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </article>

      <Footer />
      <WhatsappFab />
    </div>
  );
}