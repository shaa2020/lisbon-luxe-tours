import { useFeaturedReviews } from "@/lib/reviews";

const ITEMS = [
  { k: "Licensed", v: "Local Lisbon operator" },
  { k: "100% electric", v: "Quiet, fume-free fleet" },
  { k: "Free cancellation", v: "Up to 24h before" },
  { k: "Instant confirmation", v: "Secure online payment" },
];

/**
 * Honest trust band shown while there are no published reviews yet.
 * Once reviews exist the reviews section takes over and this hides itself.
 */
export function TrustStrip() {
  const { data: reviews = [] } = useFeaturedReviews(1);
  if (reviews.length > 0) return null;

  return (
    <section className="border-y border-ink/10 bg-white">
      <div className="container-x py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {ITEMS.map((i) => (
          <div key={i.k} className="text-center md:text-left">
            <p className="font-display text-[15px] font-bold text-ink leading-tight">{i.k}</p>
            <p className="text-[12px] text-body mt-1 leading-snug">{i.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
