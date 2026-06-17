import { useFeaturedReviews, aggregateReviews, useTourReviews } from "@/lib/reviews";
import { StarRating } from "./StarRating";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function useAllApprovedReviews(limit = 9) {
  return useQuery({
    queryKey: ["reviews", "approved-all", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews_public" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        author_name: string;
        rating: number;
        title: string | null;
        body: string;
        tour_slug: string | null;
        travel_date: string | null;
        created_at: string;
      }>;
    },
  });
}

export function TestimonialsSection() {
  const { data: featured = [] } = useFeaturedReviews(6);
  const { data: all = [] } = useAllApprovedReviews(9);
  const list = featured.length ? featured : all;
  const stats = aggregateReviews(
    list.map((r) => ({ ...r, status: "approved" as const, featured: true, author_email: null, tour_id: null, updated_at: r.created_at })),
  );

  if (list.length === 0) return null;

  return (
    <section className="bg-paper py-20 md:py-28">
      <div className="container-x">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="eyebrow text-gold mb-3">Guest stories</p>
          <h2 className="font-display text-3xl md:text-5xl font-bold text-ink leading-tight mb-5">
            Loved by travelers from around the world
          </h2>
          {stats.count > 0 && (
            <div className="flex items-center justify-center gap-3">
              <StarRating value={stats.average} readOnly size={20} />
              <p className="text-sm text-body">
                <span className="font-semibold text-ink">{stats.average.toFixed(1)}</span> ·{" "}
                {stats.count} verified review{stats.count === 1 ? "" : "s"}
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.slice(0, 6).map((r) => (
            <article
              key={r.id}
              className="bg-white rounded-2xl border border-border p-6 shadow-[0_8px_24px_rgba(30,58,95,0.05)] flex flex-col"
            >
              <StarRating value={r.rating} readOnly size={16} />
              {r.title && (
                <h3 className="font-display text-lg font-semibold text-ink mt-3 mb-1">
                  {r.title}
                </h3>
              )}
              <p className="text-sm text-body leading-relaxed mt-2 flex-1">
                "{r.body.length > 240 ? r.body.slice(0, 240) + "…" : r.body}"
              </p>
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">{r.author_name}</span>
                <span className="text-body/70">
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
