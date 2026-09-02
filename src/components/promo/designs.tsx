import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { X, ArrowRight, Tag } from "lucide-react";
import type { Promotion } from "@/lib/promotions";

export type PromoViewProps = {
  p: Promotion;
  onDismiss?: () => void;
  onCta?: () => void;
  onCopy?: () => void;
  /** Static render for the admin gallery — no fixed positioning, no dismiss. */
  preview?: boolean;
};

/* ------------------------------- primitives ------------------------------- */

function useCopy(p: Promotion, onCopy?: () => void) {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: () => {
      if (!p.code) return;
      navigator.clipboard?.writeText(p.code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2200);
    },
  };
}

function Cta({
  p,
  onCta,
  className,
}: {
  p: Promotion;
  onCta?: () => void;
  className: string;
}) {
  if (!p.cta_label || !p.cta_url) return null;
  if (p.cta_url.startsWith("http")) {
    return (
      <a href={p.cta_url} target="_blank" rel="noreferrer" onClick={onCta} className={className}>
        {p.cta_label}
      </a>
    );
  }
  return (
    <Link to={p.cta_url} onClick={onCta} className={className}>
      {p.cta_label}
    </Link>
  );
}

function Code({
  p,
  onCopy,
  className,
}: {
  p: Promotion;
  onCopy?: () => void;
  className: string;
}) {
  const { copied, copy } = useCopy(p, onCopy);
  if (!p.code) return null;
  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? "Copied!" : p.code}
    </button>
  );
}

function Close({ onDismiss, className }: { onDismiss?: () => void; className: string }) {
  if (!onDismiss) return null;
  return (
    <button type="button" onClick={onDismiss} aria-label="Dismiss promotion" className={className}>
      <X className="w-4 h-4" />
    </button>
  );
}

function Bar({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="container-x relative flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 py-2.5 pr-9 text-center">
        {children}
      </div>
    </div>
  );
}

function Text({ p, sub = "opacity-85" }: { p: Promotion; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] sm:text-[14px] font-semibold leading-snug">{p.headline}</p>
      {p.subtext && <p className={`text-[11px] sm:text-[12px] leading-snug ${sub}`}>{p.subtext}</p>}
    </div>
  );
}

function useCountdown(target: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    const tick = () => setLeft(new Date(target).getTime() - Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  if (left == null || left <= 0) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

const PILL_LIGHT =
  "shrink-0 rounded-full border border-white/50 bg-white/15 px-3 py-1 font-mono text-[11px] tracking-[0.2em] transition-colors hover:bg-white/25";
const CTA_LIGHT =
  "shrink-0 rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink transition-colors hover:bg-ink hover:text-white";

/* ---------------------------------- bars ---------------------------------- */

function ClassicGold(v: PromoViewProps) {
  return (
    <Bar className="bg-gold text-white shadow-[0_-10px_34px_rgba(30,58,95,0.28)]">
      <Text p={v.p} />
      <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
      <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function InkNight(v: PromoViewProps) {
  return (
    <Bar className="bg-ink text-white">
      <Text p={v.p} sub="text-white/70" />
      <Code
        p={v.p}
        onCopy={v.onCopy}
        className="shrink-0 rounded-full border border-gold/60 bg-gold/15 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-gold hover:bg-gold/25"
      />
      <Cta
        p={v.p}
        onCta={v.onCta}
        className="shrink-0 rounded-full bg-gold px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-white hover:text-ink"
      />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function SunsetGradient(v: PromoViewProps) {
  return (
    <Bar className="bg-[linear-gradient(100deg,#1E3A5F_0%,#2BB6F7_55%,#F5A623_100%)] text-white">
      <Text p={v.p} />
      <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
      <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function Marquee(v: PromoViewProps) {
  const line = [v.p.headline, v.p.subtext, v.p.code ? `Code ${v.p.code}` : null].filter(Boolean).join("  ·  ");
  return (
    <div className="relative w-full overflow-hidden bg-ink text-white py-2.5">
      <div className="flex whitespace-nowrap [animation:tt24-marquee_28s_linear_infinite]">
        {[0, 1].map((i) => (
          <span key={i} className="px-6 text-[13px] font-semibold tracking-wide">
            {`${line}  ·  `.repeat(3)}
          </span>
        ))}
      </div>
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </div>
  );
}

function TicketStub(v: PromoViewProps) {
  return (
    <Bar className="bg-paper text-ink border-y-2 border-dashed border-gold">
      <Tag className="w-4 h-4 text-gold shrink-0" />
      <Text p={v.p} sub="text-body" />
      <Code
        p={v.p}
        onCopy={v.onCopy}
        className="shrink-0 rounded-[3px] border border-dashed border-ink/40 bg-white px-3 py-1 font-mono text-[11px] tracking-[0.25em] hover:border-gold"
      />
      <Cta
        p={v.p}
        onCta={v.onCta}
        className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-gold"
      />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100" />
    </Bar>
  );
}

function Countdown(v: PromoViewProps) {
  const left = useCountdown(v.p.ends_at);
  return (
    <Bar className="bg-ink text-white">
      <Text p={v.p} sub="text-white/70" />
      {left && (
        <span className="shrink-0 rounded-md bg-gold px-3 py-1 font-mono text-[12px] tracking-widest text-white tabular-nums">
          {left}
        </span>
      )}
      <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
      <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function MinimalRule(v: PromoViewProps) {
  return (
    <Bar className="bg-white text-ink border-b border-border">
      <p className="text-[12px] tracking-wide">
        {v.p.headline}
        {v.p.subtext && <span className="text-body"> — {v.p.subtext}</span>}
      </p>
      <Code
        p={v.p}
        onCopy={v.onCopy}
        className="shrink-0 font-mono text-[11px] tracking-[0.25em] text-gold underline underline-offset-4"
      />
      <Cta p={v.p} onCta={v.onCta} className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-ink underline underline-offset-4 hover:text-gold" />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100" />
    </Bar>
  );
}

function SplitColour(v: PromoViewProps) {
  return (
    <div className="relative w-full flex flex-col sm:flex-row items-stretch">
      <div className="flex-1 bg-ink text-white px-5 py-3 flex items-center justify-center sm:justify-end text-center sm:text-right">
        <Text p={v.p} sub="text-white/70" />
      </div>
      <div className="flex items-center justify-center gap-3 bg-gold text-white px-5 py-3">
        <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
        <Cta
          p={v.p}
          onCta={v.onCta}
          className="shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest hover:underline"
        />
        <ArrowRight className="w-4 h-4" />
      </div>
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-2 p-1 text-white/70 hover:text-white" />
    </div>
  );
}

function TilePattern(v: PromoViewProps) {
  return (
    <Bar className="relative bg-[#0F2C4C] text-white [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.16)_1px,transparent_0)] [background-size:14px_14px]">
      <Text p={v.p} sub="text-white/70" />
      <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
      <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function Glass(v: PromoViewProps) {
  return (
    <Bar className="bg-ink/70 text-white backdrop-blur-xl border-b border-white/15">
      <Text p={v.p} sub="text-white/70" />
      <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
      <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </Bar>
  );
}

function StickyFooterOffer(v: PromoViewProps) {
  return (
    <div className="relative w-full bg-ink text-white shadow-[0_-8px_30px_rgba(30,58,95,0.3)]">
      <div className="container-x flex items-center gap-3 py-2.5 pr-9">
        <Tag className="w-4 h-4 text-gold shrink-0" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[13px] font-semibold">{v.p.headline}</p>
          {v.p.subtext && <p className="truncate text-[11px] text-white/70">{v.p.subtext}</p>}
        </div>
        <Code p={v.p} onCopy={v.onCopy} className="shrink-0 rounded-full border border-gold/60 bg-gold/15 px-3 py-1 font-mono text-[11px] tracking-[0.2em] text-gold" />
        <Cta p={v.p} onCta={v.onCta} className="shrink-0 rounded-full bg-gold px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white" />
      </div>
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
    </div>
  );
}

function HeroRibbon(v: PromoViewProps) {
  return (
    <div className="relative w-full bg-gold/10 border-y border-gold/40 text-ink">
      <div className="container-x flex flex-wrap items-center justify-center gap-3 py-2 pr-9 text-center">
        <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white">
          {v.p.badge_text || "Offer"}
        </span>
        <p className="text-[13px] font-semibold">{v.p.headline}</p>
        {v.p.subtext && <span className="text-[12px] text-body">{v.p.subtext}</span>}
        <Code p={v.p} onCopy={v.onCopy} className="font-mono text-[11px] tracking-[0.25em] text-gold underline underline-offset-4" />
        <Cta p={v.p} onCta={v.onCta} className="text-[11px] font-semibold uppercase tracking-widest text-ink underline underline-offset-4 hover:text-gold" />
      </div>
      <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-50 hover:opacity-100" />
    </div>
  );
}

/* --------------------------------- inline --------------------------------- */

function InlineWrap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`container-x my-10 ${className}`}>{children}</div>;
}

function FeatureCard(v: PromoViewProps) {
  return (
    <InlineWrap>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-[0_18px_50px_rgba(30,58,95,0.08)] grid md:grid-cols-[1.1fr_1.4fr]">
        {v.p.image_url ? (
          <img src={v.p.image_url} alt="" className="h-48 md:h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-32 md:h-full bg-[linear-gradient(140deg,#1E3A5F,#2BB6F7)]" />
        )}
        <div className="p-6 md:p-9">
          {v.p.badge_text && (
            <span className="inline-block rounded-full bg-gold/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">
              {v.p.badge_text}
            </span>
          )}
          <h3 className="mt-3 text-2xl md:text-[28px] font-semibold text-ink leading-tight">{v.p.headline}</h3>
          {v.p.subtext && <p className="mt-2 text-body leading-relaxed">{v.p.subtext}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Cta
              p={v.p}
              onCta={v.onCta}
              className="rounded-full bg-ink px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-gold transition-colors"
            />
            <Code
              p={v.p}
              onCopy={v.onCopy}
              className="rounded-full border border-dashed border-ink/30 px-4 py-2.5 font-mono text-[12px] tracking-[0.25em] text-ink hover:border-gold hover:text-gold"
            />
          </div>
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 rounded-full bg-white/80 p-1 text-ink/60 hover:text-ink" />
      </div>
    </InlineWrap>
  );
}

function CouponCard(v: PromoViewProps) {
  return (
    <InlineWrap>
      <div className="relative mx-auto max-w-3xl rounded-2xl border-2 border-dashed border-gold bg-paper p-7 text-center">
        {v.p.badge_text && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">{v.p.badge_text}</p>
        )}
        <h3 className="mt-2 text-2xl md:text-3xl font-semibold text-ink">{v.p.headline}</h3>
        {v.p.subtext && <p className="mt-2 text-body">{v.p.subtext}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Code
            p={v.p}
            onCopy={v.onCopy}
            className="rounded-lg bg-white px-6 py-3 font-mono text-lg tracking-[0.35em] text-ink shadow-inner border border-ink/10 hover:border-gold"
          />
          <Cta
            p={v.p}
            onCta={v.onCta}
            className="rounded-full bg-gold px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-ink transition-colors"
          />
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 p-1 text-ink/40 hover:text-ink" />
      </div>
    </InlineWrap>
  );
}

function PosterStrip(v: PromoViewProps) {
  return (
    <InlineWrap>
      <div className="relative overflow-hidden rounded-2xl min-h-[240px] flex items-end">
        {v.p.image_url ? (
          <img src={v.p.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#1E3A5F,#0F2C4C)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent" />
        <div className="relative p-7 md:p-10 text-white max-w-2xl">
          <h3 className="text-2xl md:text-4xl font-semibold leading-tight">{v.p.headline}</h3>
          {v.p.subtext && <p className="mt-2 text-white/80">{v.p.subtext}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
            <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
          </div>
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 p-1 text-white/70 hover:text-white" />
      </div>
    </InlineWrap>
  );
}

function StatRibbon(v: PromoViewProps) {
  const points = (v.p.subtext || "").split("·").map((s) => s.trim()).filter(Boolean);
  return (
    <InlineWrap>
      <div className="relative rounded-2xl bg-ink text-white px-6 py-7 md:px-10">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
          <h3 className="text-xl md:text-2xl font-semibold md:max-w-sm">{v.p.headline}</h3>
          <div className="flex flex-wrap gap-x-10 gap-y-4 flex-1">
            {points.map((pt, i) => (
              <div key={i} className="min-w-[120px]">
                <p className="text-[13px] text-white/75">{pt}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Code p={v.p} onCopy={v.onCopy} className={PILL_LIGHT} />
            <Cta p={v.p} onCta={v.onCta} className={CTA_LIGHT} />
          </div>
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 p-1 text-white/60 hover:text-white" />
      </div>
    </InlineWrap>
  );
}

function DuoSplit(v: PromoViewProps) {
  return (
    <InlineWrap>
      <div className="relative grid md:grid-cols-2 overflow-hidden rounded-2xl border border-border">
        <div className="bg-white p-7 md:p-9">
          <h3 className="text-2xl font-semibold text-ink leading-tight">{v.p.headline}</h3>
          {v.p.subtext && <p className="mt-2 text-body">{v.p.subtext}</p>}
          <Cta
            p={v.p}
            onCta={v.onCta}
            className="mt-5 inline-block rounded-full bg-ink px-6 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-gold transition-colors"
          />
        </div>
        <div className="flex flex-col items-center justify-center gap-3 bg-gold/12 p-7 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
            {v.p.badge_text || "Use code"}
          </p>
          <Code
            p={v.p}
            onCopy={v.onCopy}
            className="rounded-lg border border-dashed border-gold bg-white px-6 py-3 font-mono text-lg tracking-[0.3em] text-ink"
          />
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 p-1 text-ink/40 hover:text-ink" />
      </div>
    </InlineWrap>
  );
}

function Editorial(v: PromoViewProps) {
  return (
    <InlineWrap>
      <div className="relative mx-auto max-w-3xl border-y border-ink/15 py-10 text-center">
        {v.p.badge_text && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold">{v.p.badge_text}</p>
        )}
        <h3 className="mt-3 font-serif text-3xl md:text-[40px] leading-tight text-ink">{v.p.headline}</h3>
        {v.p.subtext && <p className="mt-3 text-body max-w-xl mx-auto">{v.p.subtext}</p>}
        <div className="mt-6 flex items-center justify-center gap-5">
          <Cta p={v.p} onCta={v.onCta} className="text-[12px] font-semibold uppercase tracking-[0.25em] text-ink underline underline-offset-8 hover:text-gold" />
          <Code p={v.p} onCopy={v.onCopy} className="font-mono text-[12px] tracking-[0.3em] text-gold" />
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-0 top-2 p-1 text-ink/40 hover:text-ink" />
      </div>
    </InlineWrap>
  );
}

/* --------------------------------- overlay -------------------------------- */

function CornerPill(v: PromoViewProps) {
  return (
    <div className={v.preview ? "" : "fixed bottom-24 left-4 z-40 max-w-[280px]"}>
      <div className="relative flex items-center gap-3 rounded-full bg-ink text-white pl-4 pr-9 py-3 shadow-xl">
        <Tag className="w-4 h-4 text-gold shrink-0" />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold">{v.p.headline}</p>
          <Cta p={v.p} onCta={v.onCta} className="text-[11px] text-gold underline underline-offset-2" />
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100" />
      </div>
    </div>
  );
}

function SlideIn(v: PromoViewProps) {
  return (
    <div className={v.preview ? "" : "fixed bottom-24 right-4 z-40 w-[300px] [animation:tt24-slide-in_.5s_ease-out]"}>
      <div className="relative rounded-xl bg-white border border-border shadow-2xl p-5">
        {v.p.badge_text && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gold">{v.p.badge_text}</span>
        )}
        <p className="mt-1.5 text-[15px] font-semibold text-ink leading-snug">{v.p.headline}</p>
        {v.p.subtext && <p className="mt-1.5 text-[12px] text-body leading-relaxed">{v.p.subtext}</p>}
        <div className="mt-4 flex items-center gap-2">
          <Cta
            p={v.p}
            onCta={v.onCta}
            className="rounded-full bg-ink px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-white hover:bg-gold"
          />
          <Code p={v.p} onCopy={v.onCopy} className="font-mono text-[11px] tracking-[0.2em] text-gold" />
        </div>
        <Close onDismiss={v.onDismiss} className="absolute right-2 top-2 p-1 text-ink/40 hover:text-ink" />
      </div>
    </div>
  );
}

function CentreModal(v: PromoViewProps) {
  const card = (
    <div className="relative w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
      {v.p.badge_text && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">{v.p.badge_text}</p>
      )}
      <h3 className="mt-2 text-2xl font-semibold text-ink leading-tight">{v.p.headline}</h3>
      {v.p.subtext && <p className="mt-2.5 text-body text-sm leading-relaxed">{v.p.subtext}</p>}
      <Code
        p={v.p}
        onCopy={v.onCopy}
        className="mt-5 inline-block rounded-lg border border-dashed border-gold bg-paper px-6 py-3 font-mono text-base tracking-[0.3em] text-ink"
      />
      <div className="mt-5">
        <Cta
          p={v.p}
          onCta={v.onCta}
          className="inline-block rounded-full bg-gold px-7 py-3 text-[12px] font-semibold uppercase tracking-widest text-white hover:bg-ink transition-colors"
        />
      </div>
      <Close onDismiss={v.onDismiss} className="absolute right-3 top-3 p-1 text-ink/40 hover:text-ink" />
    </div>
  );
  if (v.preview) return <div className="flex justify-center bg-ink/10 p-6">{card}</div>;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 backdrop-blur-sm p-5">{card}</div>;
}

function RibbonBadge(v: PromoViewProps) {
  return (
    <div className={v.preview ? "relative h-24 w-56 rounded-xl bg-cloud" : "pointer-events-none absolute left-0 top-4 z-10"}>
      <span className="inline-block rounded-r-full bg-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-md">
        {v.p.badge_text || v.p.headline}
      </span>
    </div>
  );
}

/* -------------------------------- registry -------------------------------- */

export const PROMO_COMPONENTS: Record<string, (v: PromoViewProps) => ReactNode> = {
  classic_gold: ClassicGold,
  ink_night: InkNight,
  sunset_gradient: SunsetGradient,
  marquee: Marquee,
  ticket_stub: TicketStub,
  countdown: Countdown,
  minimal_rule: MinimalRule,
  split_colour: SplitColour,
  tile_pattern: TilePattern,
  glass: Glass,
  sticky_footer_offer: StickyFooterOffer,
  hero_ribbon: HeroRibbon,
  feature_card: FeatureCard,
  coupon_card: CouponCard,
  poster_strip: PosterStrip,
  stat_ribbon: StatRibbon,
  duo_split: DuoSplit,
  editorial: Editorial,
  corner_pill: CornerPill,
  slide_in: SlideIn,
  centre_modal: CentreModal,
  ribbon_badge: RibbonBadge,
};

export function PromoView(props: PromoViewProps) {
  const Comp = PROMO_COMPONENTS[props.p.design] ?? ClassicGold;
  return <>{Comp(props)}</>;
}
