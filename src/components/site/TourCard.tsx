import { Link } from "@tanstack/react-router";
import type { Tour } from "@/data/tours";

export function TourCard({ tour, offset = false }: { tour: Tour; offset?: boolean }) {
  return (
    <Link
      to="/tours/$slug"
      params={{ slug: tour.slug }}
      className={`group block ${offset ? "md:translate-y-12" : ""}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl mb-6 bg-secondary">
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="font-mono text-[9px] uppercase tracking-tighter">{tour.duration}</span>
        </div>
        {tour.featured && (
          <div className="absolute top-4 right-4 bg-gold text-ink px-3 py-1 rounded-full">
            <span className="font-mono text-[9px] uppercase tracking-tighter">Signature</span>
          </div>
        )}
      </div>
      <h3 className="font-serif text-2xl mb-2">{tour.title}</h3>
      <p className="text-xs text-ink/50 uppercase tracking-widest mb-3">{tour.tagline}</p>
      <p className="text-gold font-semibold">From €{tour.priceFrom}</p>
    </Link>
  );
}
