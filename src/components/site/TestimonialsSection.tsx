import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFeaturedReviews, aggregateReviews, useTourReviews } from "@/lib/reviews";
import { StarRating } from "./StarRating";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeReview, setActiveReview] = useState(0);
  const stats = aggregateReviews(
    list.map((r) => ({ ...r, status: "approved" as const, featured: true, author_email: null, tour_id: null, updated_at: r.created_at })),
  );

  if (list.length === 0) return null;

  const moveSlider = (direction: -1 | 1) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const card = slider.firstElementChild as HTMLElement | null;
    if (!card) return;
    slider.scrollBy({ left: direction * (card.offsetWidth + 20), behavior: "smooth" });
  };

  const updateActiveReview = () => {
    const slider = sliderRef.current;
    const card = slider?.firstElementChild as HTMLElement | null;
    if (!slider || !card) return;
    setActiveReview(Math.min(list.length - 1, Math.round(slider.scrollLeft / (card.offsetWidth + 20))));
  };

  return (
    <section id="guest-reviews" className="bg-white border-t border-border py-12 md:py-16">
      <div className="container-x">
        <div className="flex items-end justify-between gap-5 mb-7">
          <div>
            <p className="eyebrow text-gold mb-2">Guest stories</p>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-ink leading-tight">
              What our guests say
            </h2>
            {stats.count > 0 && (
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <StarRating value={stats.average} readOnly size={16} />
                <p className="text-sm text-body">
                  <span className="font-semibold text-ink">{stats.average.toFixed(1)}</span> ·{" "}
                  {stats.count} verified review{stats.count === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>

          {list.length > 1 && (
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSlider(-1)}
                aria-label="Previous review"
                title="Previous review"
                className="rounded-full shadow-none"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSlider(1)}
                aria-label="Next review"
                title="Next review"
                className="rounded-full shadow-none"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>

        <div
          ref={sliderRef}
          onScroll={updateActiveReview}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((r) => (
            <article
              key={r.id}
              className="w-[88%] sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] shrink-0 snap-start bg-paper rounded-lg border border-border p-5 md:p-6 flex flex-col"
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

        {list.length > 1 && (
          <div className="mt-5 flex items-center justify-between sm:justify-end gap-4">
            <p className="sm:hidden text-xs text-body tabular-nums" aria-live="polite">
              {activeReview + 1} / {list.length}
            </p>
            <div className="flex sm:hidden items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSlider(-1)}
                aria-label="Previous review"
                className="rounded-full shadow-none"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => moveSlider(1)}
                aria-label="Next review"
                className="rounded-full shadow-none"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
