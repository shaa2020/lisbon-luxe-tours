import { Link } from "@tanstack/react-router";
import type { Tour } from "@/lib/cms";
import { tourPricing } from "@/lib/cms";

export function TourCard({ tour }: { tour: Tour; offset?: boolean }) {
  const pricing = tourPricing(tour);
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className="group block bg-white rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(30,58,95,0.06)] hover:shadow-[0_20px_40px_rgba(30,58,95,0.12)] hover:-translate-y-1 transition-all duration-500"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {tour.featured && (
          <span className="absolute top-3 left-3 bg-gold text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm">
            Signature
          </span>
        )}
        {pricing.onSale && (
          <span className="absolute top-3 left-3 mt-7 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm shadow-md">
            −{pricing.discountPct}% Sale
          </span>
        )}
        <span className="absolute top-3 right-3 bg-white/95 text-ink text-[11px] font-semibold px-3 py-1 rounded-full">
          {tour.duration}
        </span>
      </div>
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-2">{tour.category}</p>
        <h3 className="font-display font-semibold text-ink text-[16px] leading-snug mb-3 group-hover:text-gold transition-colors">
          {tour.title}
        </h3>
        <div className="flex items-end justify-between pt-3 border-t border-border">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-body">From </span>
            {pricing.onSale ? (
              <span className="inline-flex items-baseline gap-2">
                <span className="text-gold font-display font-bold text-xl">€{pricing.current}</span>
                <span className="text-body/60 text-sm line-through">€{pricing.original}</span>
              </span>
            ) : (
              <span className="text-gold font-display font-bold text-xl">€{pricing.current}</span>
            )}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 group-hover:text-gold transition">View →</span>
        </div>
      </div>
    </Link>
  );
}
