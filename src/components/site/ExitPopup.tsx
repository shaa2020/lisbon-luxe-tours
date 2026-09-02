import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useSiteBrand } from "@/lib/brand";
import { trackBookingCtaClick } from "@/lib/analytics";

const STORAGE_KEY = "tt24_exit_popup_v1";
const HIDDEN_PREFIXES = ["/admin", "/booking", "/invoice", "/auth", "/lovable"];

/**
 * Tasteful exit-intent popup. Shows once per session (per content version),
 * either when the cursor leaves the viewport (desktop) or after 45s (mobile).
 * Fully editable from Admin → Settings → Marketing.
 */
export function ExitPopup() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { exitPopup, business } = useSiteBrand();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!exitPopup.enabled) return;
    if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return;
    const sig = `${exitPopup.headline}|${exitPopup.code ?? ""}`;
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === sig) return;
    } catch {
      /* private mode */
    }

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setOpen(true);
      try {
        sessionStorage.setItem(STORAGE_KEY, sig);
      } catch {
        /* ignore */
      }
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) show();
    };
    const timer = window.setTimeout(show, 45_000);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.clearTimeout(timer);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [exitPopup.enabled, exitPopup.headline, exitPopup.code, pathname]);

  if (!open) return null;

  const waHref = `https://wa.me/${(business.whatsappPhone || "").replace(/[^\d]/g, "")}?text=${encodeURIComponent(
    "Hi Tuk Tuk 24! I have a question about booking a tour.",
  )}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        aria-label="Close"
        className="absolute inset-0 bg-ink/60 backdrop-blur-sm cursor-default"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-[0_40px_90px_rgba(10,20,35,0.35)] animate-[scale-in_0.5s_var(--ease-out-expo)_both]">
        <button
          onClick={() => setOpen(false)}
          aria-label="Dismiss"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-cloud text-ink flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="eyebrow text-gold mb-3">Before you go</p>
        <h2 className="font-display text-2xl font-bold text-ink leading-tight pr-6">
          {exitPopup.headline}
        </h2>
        {exitPopup.subtext && (
          <p className="mt-3 text-sm text-body leading-relaxed">{exitPopup.subtext}</p>
        )}

        {exitPopup.code && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-dashed border-gold bg-gold/10 px-4 py-2">
            <span className="text-[11px] uppercase tracking-widest text-ink/60">Use code</span>
            <span className="font-mono text-sm font-bold tracking-[0.15em] text-ink">{exitPopup.code}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            to="/tours"
            onClick={() => {
              trackBookingCtaClick("exit_popup");
              setOpen(false);
            }}
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition-colors"
          >
            {exitPopup.ctaLabel} →
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center px-6 py-3.5 rounded-full border border-[#25D366] text-ink text-[12px] font-semibold uppercase tracking-widest hover:bg-[#25D366]/10 transition-colors"
          >
            WhatsApp us
          </a>
        </div>

        <p className="mt-4 text-center text-[11px] text-body">
          Free cancellation up to 24h before your tour.
        </p>
      </div>
    </div>
  );
}
