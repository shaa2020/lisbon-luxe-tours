import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { headingId, type GuideBlock } from "@/lib/travel-guide";
import { useTours, tourPricing } from "@/lib/cms";

/** Minimal, safe inline formatting: **bold**, *italic*, [text](href). No raw HTML. */
function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) nodes.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("*")) nodes.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    else {
      const label = tok.slice(1, tok.indexOf("]"));
      const href = tok.slice(tok.indexOf("(") + 1, -1);
      nodes.push(
        href.startsWith("/") ? (
          <Link key={key++} to={href} className="text-gold font-semibold hover:text-ink transition-colors underline underline-offset-2">
            {label}
          </Link>
        ) : (
          <a key={key++} href={href} rel="noopener noreferrer" target="_blank" className="text-gold font-semibold hover:text-ink transition-colors underline underline-offset-2">
            {label}
          </a>
        ),
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Callout({
  tone,
  title,
  text,
}: {
  tone: "tip" | "info" | "warning";
  title?: string;
  text: string;
}) {
  const styles = {
    tip: "border-gold/40 bg-gold/[0.07]",
    info: "border-ink/15 bg-cloud/60",
    warning: "border-amber-400/50 bg-amber-50",
  }[tone];
  return (
    <aside className={`my-8 rounded-xl border ${styles} p-5 sm:p-6`}>
      {title ? (
        <p className="eyebrow text-gold mb-2">{title}</p>
      ) : null}
      <p className="text-body text-[15px] leading-relaxed">{inline(text)}</p>
    </aside>
  );
}

function InlineTourCard({ slug }: { slug: string }) {
  const { data: tours = [] } = useTours();
  const tour = tours.find((t) => t.slug === slug);
  if (!tour) return null;
  const price = tourPricing(tour);
  return (
    <div className="my-8 overflow-hidden rounded-xl border border-border bg-white shadow-[0_10px_30px_rgba(30,58,95,0.07)] sm:flex">
      <div className="sm:w-56 shrink-0">
        <img
          src={tour.image}
          alt={tour.title}
          loading="lazy"
          className="h-44 w-full object-cover sm:h-full"
        />
      </div>
      <div className="flex-1 p-5 sm:p-6">
        <p className="eyebrow text-gold mb-2">{tour.category} · {tour.duration}</p>
        <h3 className="font-display text-xl font-bold text-ink leading-snug">{tour.title}</h3>
        {tour.tagline ? <p className="text-body text-sm mt-2 leading-relaxed">{tour.tagline}</p> : null}
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-ink font-semibold">
            {price.onSale ? (
              <>
                <span className="text-body/60 line-through text-sm mr-2">€{price.original}</span>€{price.current}
              </>
            ) : (
              <>From €{price.current}</>
            )}
          </p>
          <Link
            to="/tours/$slug"
            params={{ slug: tour.slug }}
            className="inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-gold transition-colors"
          >
            View tour
          </Link>
        </div>
      </div>
    </div>
  );
}

export function GuideContent({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <div className="guide-content">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const id = headingId(block.text);
            if (block.level === 3)
              return (
                <h3 key={i} id={id} className="font-display text-xl sm:text-2xl font-bold text-ink mt-10 mb-3 scroll-mt-28">
                  {block.text}
                </h3>
              );
            if (block.level === 4)
              return (
                <h4 key={i} id={id} className="font-semibold text-lg text-ink mt-8 mb-2 scroll-mt-28">
                  {block.text}
                </h4>
              );
            return (
              <h2 key={i} id={id} className="font-display text-2xl sm:text-3xl font-bold text-ink mt-12 mb-4 scroll-mt-28">
                {block.text}
              </h2>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="text-body text-[16px] sm:text-[17px] leading-[1.8] mb-5">
                {inline(block.text)}
              </p>
            );
          case "list":
            return block.ordered ? (
              <ol key={i} className="list-decimal pl-5 space-y-2 mb-6 text-body text-[16px] leading-[1.8] marker:text-gold marker:font-semibold">
                {block.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            ) : (
              <ul key={i} className="space-y-2 mb-6">
                {block.items.map((it, j) => (
                  <li key={j} className="relative pl-6 text-body text-[16px] leading-[1.8]">
                    <span className="absolute left-0 top-[0.65em] h-1.5 w-1.5 rounded-full bg-gold" />
                    {inline(it)}
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote key={i} className="my-8 border-l-2 border-gold pl-5 sm:pl-6">
                <p className="font-display text-xl sm:text-2xl text-ink leading-snug">{block.text}</p>
                {block.cite ? <cite className="mt-3 block text-xs uppercase tracking-widest text-body/70 not-italic">{block.cite}</cite> : null}
              </blockquote>
            );
          case "image":
            return block.url ? (
              <figure key={i} className="my-8">
                <img
                  src={block.url}
                  alt={block.alt || ""}
                  loading="lazy"
                  className="w-full rounded-xl object-cover"
                />
                {block.caption ? (
                  <figcaption className="mt-2 text-xs text-body/70">{block.caption}</figcaption>
                ) : null}
              </figure>
            ) : null;
          case "tip":
          case "info":
          case "warning":
            return <Callout key={i} tone={block.type} title={block.title} text={block.text} />;
          case "table":
            return (
              <div key={i} className="my-8 overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-cloud/70">
                    <tr>
                      {block.headers.map((h, j) => (
                        <th key={j} className="px-4 py-3 font-semibold text-ink whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      <tr key={j} className="border-t border-border">
                        {row.map((cell, k) => (
                          <td key={k} className="px-4 py-3 text-body align-top">{inline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "cta":
            return (
              <div key={i} className="my-10 rounded-2xl bg-ink p-6 sm:p-8 text-white">
                <h3 className="font-display text-2xl font-bold leading-snug">{block.title}</h3>
                {block.text ? <p className="mt-2 text-white/75 text-sm leading-relaxed">{block.text}</p> : null}
                {block.href.startsWith("/") ? (
                  <Link
                    to={block.href}
                    className="mt-5 inline-flex items-center rounded-full bg-gold px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white hover:text-ink transition-colors"
                  >
                    {block.label}
                  </Link>
                ) : (
                  <a
                    href={block.href}
                    className="mt-5 inline-flex items-center rounded-full bg-gold px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white hover:text-ink transition-colors"
                  >
                    {block.label}
                  </a>
                )}
              </div>
            );
          case "tour":
            return <InlineTourCard key={i} slug={block.slug} />;
          case "divider":
            return <hr key={i} className="my-10 border-border" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
