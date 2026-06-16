import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";
import { aggregateReviews, useSubmitReview, useTourReviews } from "@/lib/reviews";
import { StarRating } from "./StarRating";

export function ReviewsSection({
  tourId,
  tourSlug,
  tourTitle,
}: {
  tourId?: string | null;
  tourSlug: string;
  tourTitle: string;
}) {
  const { data: reviews = [], isLoading } = useTourReviews(tourSlug);
  const submit = useSubmitReview();
  const stats = aggregateReviews(reviews);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [travelDate, setTravelDate] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submit.mutateAsync({
        tour_id: tourId ?? null,
        tour_slug: tourSlug,
        author_name: name,
        author_email: email || null,
        rating,
        title: title || null,
        body,
        travel_date: travelDate || null,
      });
      toast.success("Thanks! Your review is pending moderation.");
      setName(""); setEmail(""); setRating(5);
      setTitle(""); setBody(""); setTravelDate("");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || "Could not submit review.");
    }
  };

  return (
    <section className="border-t border-border pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow text-gold mb-3">Guest reviews</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink">
            {stats.count > 0 ? "What our guests say" : "Be the first to share your experience"}
          </h2>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="px-5 py-2.5 rounded-full bg-ink text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-gold transition"
        >
          {open ? "Close" : "Write a review"}
        </button>
      </div>

      {stats.count > 0 && (
        <div className="grid sm:grid-cols-[auto_1fr] gap-8 mb-10 p-6 rounded-2xl bg-cloud/60 border border-border">
          <div className="text-center sm:text-left">
            <p className="font-display text-5xl font-bold text-gold leading-none">
              {stats.average.toFixed(1)}
            </p>
            <StarRating value={stats.average} readOnly className="mt-2" />
            <p className="text-xs text-body mt-2">
              Based on {stats.count} verified review{stats.count === 1 ? "" : "s"}
            </p>
          </div>
          <div className="space-y-1.5">
            {([5, 4, 3, 2, 1] as const).map((s) => {
              const c = stats.distribution[s];
              const pct = stats.count ? (c / stats.count) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-3 text-xs text-body">
                  <span className="w-6 text-ink/70">{s}★</span>
                  <div className="flex-1 h-2 rounded-full bg-paper overflow-hidden border border-border">
                    <div
                      className="h-full bg-gold transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {open && (
        <form
          onSubmit={onSubmit}
          className="mb-10 p-6 rounded-2xl border border-border bg-white space-y-4"
        >
          <p className="text-sm text-body">
            Sharing your experience of <span className="font-semibold text-ink">{tourTitle}</span>. Reviews appear after a quick moderation check.
          </p>
          <div>
            <span className="text-[11px] uppercase tracking-widest text-ink/60 mb-2 block">
              Your rating
            </span>
            <StarRating value={rating} onChange={setRating} size={28} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              className="px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={120}
              placeholder="Email (optional, kept private)"
              className="px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
            />
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Headline (optional)"
            className="w-full px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
          />
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={10}
            maxLength={4000}
            rows={5}
            placeholder="Tell other travellers about your experience…"
            className="w-full px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold resize-y"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-body inline-flex items-center gap-2">
              When did you travel?
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="px-2 py-1.5 rounded-md bg-white border border-border text-xs text-ink focus:outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              disabled={submit.isPending}
              className="ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition disabled:opacity-50"
            >
              {submit.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
              ) : (
                "Submit review"
              )}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-body">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-cloud/60 via-white to-cloud/40 p-10 md:p-14 text-center">
          <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[radial-gradient(circle_at_30%_20%,theme(colors.gold)_0,transparent_50%),radial-gradient(circle_at_70%_80%,theme(colors.ink)_0,transparent_50%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/30 mb-5">
              <StarRating value={5} readOnly size={14} />
              <span className="text-[11px] uppercase tracking-widest text-ink font-semibold">Trusted across platforms</span>
            </div>
            <h3 className="font-display text-xl md:text-2xl font-bold text-ink mb-3">
              Loved by travellers from around the world
            </h3>
            <p className="text-body text-sm md:text-base max-w-xl mx-auto mb-6 leading-relaxed">
              Our guests rate us 5★ on TripAdvisor, Google and GetYourGuide. We're collecting reviews here too — be among the first to share your experience of this tour.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs uppercase tracking-widest text-ink/60 font-semibold">
              <span className="inline-flex items-center gap-1.5"><span className="text-gold text-base">★★★★★</span> TripAdvisor</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-gold text-base">★★★★★</span> Google</span>
              <span className="inline-flex items-center gap-1.5"><span className="text-gold text-base">★★★★★</span> GetYourGuide</span>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-gold transition"
            >
              <MessageSquare className="w-4 h-4" /> Be the first to review
            </button>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {reviews.map((r) => (
            <article
              key={r.id}
              className="p-6 rounded-2xl border border-border bg-white hover:shadow-[0_10px_30px_rgba(30,58,95,0.06)] transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <StarRating value={r.rating} readOnly size={16} />
                <p className="text-[11px] text-body">
                  {format(new Date(r.created_at), "d MMM yyyy")}
                </p>
              </div>
              {r.title && (
                <h3 className="font-display text-lg font-semibold text-ink mb-2">
                  {r.title}
                </h3>
              )}
              <p className="text-sm text-body leading-relaxed whitespace-pre-wrap">{r.body}</p>
              <p className="text-xs text-ink/70 mt-4 pt-4 border-t border-border">
                <span className="font-semibold text-ink">{r.author_name}</span>
                {r.travel_date && (
                  <span className="text-body"> · travelled {format(new Date(r.travel_date), "MMM yyyy")}</span>
                )}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
