import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useSiteBrand, isPromoBannerLive, type PromoBanner as PromoBannerData } from "@/lib/brand";
import { trackEvent } from "@/lib/analytics";

const THEME: Record<PromoBannerData["theme"], { wrap: string; pill: string; cta: string }> = {
  gold: {
    wrap: "bg-gold text-white",
    pill: "border-white/50 bg-white/15 text-white",
    cta: "bg-white text-ink hover:bg-ink hover:text-white",
  },
  ink: {
    wrap: "bg-ink text-white",
    pill: "border-gold/60 bg-gold/15 text-gold",
    cta: "bg-gold text-white hover:bg-white hover:text-ink",
  },
  sunset: {
    wrap: "bg-[linear-gradient(100deg,#1E3A5F_0%,#2BB6F7_55%,#F5A623_100%)] text-white",
    pill: "border-white/50 bg-white/15 text-white",
    cta: "bg-white text-ink hover:bg-ink hover:text-white",
  },
};

/** Site-wide promotional banner. Managed from Admin → Settings → Marketing. */
export function PromoBanner() {
  const { promoBanner } = useSiteBrand();
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isPromoBannerLive(promoBanner) || dismissed) return null;

  const t = THEME[promoBanner.theme];
  const dismiss = () => {
    setDismissed(true);
  };

  const cta =
    promoBanner.ctaLabel && promoBanner.ctaUrl ? (
      promoBanner.ctaUrl.startsWith("http") ? (
        <a
          href={promoBanner.ctaUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackEvent("promo_banner_cta", { url: promoBanner.ctaUrl })}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${t.cta}`}
        >
          {promoBanner.ctaLabel}
        </a>
      ) : (
        <Link
          to={promoBanner.ctaUrl}
          onClick={() => trackEvent("promo_banner_cta", { url: promoBanner.ctaUrl })}
          className={`shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition-colors ${t.cta}`}
        >
          {promoBanner.ctaLabel}
        </Link>
      )
    ) : null;

  return (
    <div className={`w-full shadow-[0_-10px_34px_rgba(30,58,95,0.28)] ${t.wrap}`}>
      <div className="container-x relative flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 pr-9 text-center">
        <div className="min-w-0">
          <p className="text-[13px] sm:text-[14px] font-semibold leading-snug">{promoBanner.headline}</p>
          {promoBanner.subtext && (
            <p className="text-[11px] sm:text-[12px] opacity-85 leading-snug">{promoBanner.subtext}</p>
          )}
        </div>
        {promoBanner.code && (
          <button
            onClick={() => {
              navigator.clipboard?.writeText(promoBanner.code as string);
              setCopied(true);
              trackEvent("promo_banner_code_copy", { code: promoBanner.code });
            }}
            className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.2em] transition-colors ${t.pill}`}
          >
            {copied ? "Copied!" : promoBanner.code}
          </button>
        )}
        {cta}
        <button
          onClick={dismiss}
          aria-label="Dismiss promotion"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-70 hover:opacity-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
