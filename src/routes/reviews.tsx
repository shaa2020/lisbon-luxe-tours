import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { StarRating } from "@/components/site/StarRating";
import { aggregateReviews, useAllPublicReviews, useSubmitReview } from "@/lib/reviews";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [
      { title: "Guest Reviews | Tuk Tuk 24 Lisbon Tours" },
      {
        name: "description",
        content:
          "Read verified reviews from guests who explored Lisbon with Tuk Tuk 24 — Alfama, Belém, sunset and custom tuk-tuk tours. Share your own experience.",
      },
      { property: "og:title", content: "Guest Reviews | Tuk Tuk 24 Lisbon" },
      {
        property: "og:description",
        content: "What our guests say about their Lisbon tuk-tuk tours with local drivers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewsPage,
});

function ReviewsPage() {
  const { data: reviews = [], isLoading } = useAllPublicReviews();
  const stats = aggregateReviews(reviews.map((r) => ({ ...r, status: "approved" as const })));
  const submit = useSubmitReview();

  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submit.mutateAsync({ author_name: name, rating, title, body });
      toast.success("Thank you! Your review will appear once we've checked it.");
      setName("");
      setTitle("");
      setBody("");
      setRating(5);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const maxBar = Math.max(1, ...Object.values(stats.distribution));

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <header className="pt-32 pb-12 px-6 max-w-4xl mx-auto text-center">
        <p className="eyebrow text-gold mb-3">Guest reviews</p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-4">
          What guests say about riding with us
        </h1>
        <p className="text-body text-sm max-w-xl mx-auto leading-relaxed">
          Every review below was left by someone who took a tour with our drivers. We publish the
          good and the critical — it's how we keep getting better.
        </p>
      </header>

      <section className="px-6 max-w-4xl mx-auto">
        <div className="grid sm:grid-cols-[auto_1fr] gap-8 items-center border border-border rounded-[2px] p-6 bg-cloud/30">
          <div className="text-center sm:pr-8 sm:border-r border-border">
            <p className="font-display text-5xl text-ink leading-none">
              {stats.count ? stats.average.toFixed(1) : "—"}
            </p>
            <div className="flex justify-center mt-2">
              <StarRating value={Math.round(stats.average)} />
            </div>
            <p className="text-[11px] text-body mt-2">
              {stats.count} review{stats.count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((star) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-[11px] text-body w-8">{star}★</span>
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold"
                    style={{ width: `${(stats.distribution[star] / maxBar) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] text-body w-6 text-right">
                  {stats.distribution[star]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 max-w-4xl mx-auto py-12">
        {isLoading ? (
          <p className="text-sm text-body text-center">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-body text-center">
            No reviews here yet — be the first to write one below.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {reviews.map((r) => (
              <article key={r.id} className="border border-border rounded-[2px] p-5 bg-white/60">
                <StarRating value={r.rating} />
                {r.title ? (
                  <h2 className="font-display text-lg text-ink mt-3">{r.title}</h2>
                ) : null}
                <p className="text-sm text-body leading-relaxed mt-2 whitespace-pre-line">{r.body}</p>
                <p className="text-[11px] text-body/70 mt-4">
                  {r.author_name}
                  {r.tour_slug ? (
                    <>
                      {" · "}
                      <Link to="/tours/$slug" params={{ slug: r.tour_slug }} className="text-gold hover:underline">
                        {r.tour_slug.replace(/-/g, " ")}
                      </Link>
                    </>
                  ) : null}
                  {" · "}
                  {new Date(r.created_at).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="px-6 pb-24 max-w-2xl mx-auto">
        <div className="border border-border rounded-[2px] p-6 bg-cloud/30">
          <h2 className="font-display text-2xl text-ink mb-1">Write a review</h2>
          <p className="text-xs text-body mb-5">
            Took a tour with us? Tell other travellers what it was like. We check each review before
            publishing.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                  className={`text-2xl leading-none ${n <= rating ? "text-gold" : "text-border"}`}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Headline (optional)"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="How was your tour? What did you see, and how was your driver?"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={submit.isPending}
              className="w-full bg-ink text-paper py-3.5 rounded-[2px] font-medium tracking-[0.2em] text-[11px] uppercase hover:bg-gold transition-colors disabled:opacity-40"
            >
              {submit.isPending ? "Sending…" : "Submit review"}
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
