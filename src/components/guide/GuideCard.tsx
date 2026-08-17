import { Link } from "@tanstack/react-router";
import type { GuideCategory, GuideRow } from "@/lib/travel-guide";
import { formatGuideDate } from "@/lib/travel-guide";

export function GuideCard({
  guide,
  category,
  size = "default",
}: {
  guide: Pick<
    GuideRow,
    "slug" | "title" | "excerpt" | "hero_image_url" | "hero_image_alt" | "reading_time" | "published_at" | "category_id"
  >;
  category?: GuideCategory | undefined;
  size?: "default" | "large";
}) {
  const large = size === "large";
  return (
    <Link
      to="/lisbon-guide/$slug"
      params={{ slug: guide.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-shadow hover:shadow-[0_18px_44px_rgba(30,58,95,0.12)]"
    >
      <div className={`relative overflow-hidden bg-cloud ${large ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
        {guide.hero_image_url ? (
          <img
            src={guide.hero_image_url}
            alt={guide.hero_image_alt || guide.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-ink/85 to-gold/60" />
        )}
        {category ? (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink">
            {category.name}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3
          className={`font-display font-bold text-ink leading-snug group-hover:text-gold transition-colors ${
            large ? "text-2xl sm:text-3xl" : "text-lg"
          }`}
        >
          {guide.title}
        </h3>
        {guide.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-body">{guide.excerpt}</p>
        ) : null}
        <div className="mt-auto pt-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-body/70">
          <span>{guide.reading_time} min read</span>
          {guide.published_at ? (
            <>
              <span className="opacity-40">·</span>
              <span>{formatGuideDate(guide.published_at)}</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
