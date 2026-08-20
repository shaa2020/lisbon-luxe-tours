import { useEffect, useState } from "react";
import { X, Tag } from "lucide-react";
import { useSiteBrand } from "@/lib/brand";
import { trackEvent } from "@/lib/analytics";

const KEY = "tt24_offer_bar_dismissed";

/** Slim, dismissible book-direct offer strip. Managed from Admin → Settings → Marketing. */
export function OfferBar() {
  const { offerBar } = useSiteBrand();
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, []);

  if (!offerBar.enabled || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-ink text-white shadow-[0_-8px_30px_rgba(30,58,95,0.25)]">
      <div className="container-x flex items-center justify-center gap-3 py-2.5 pr-8 text-center">
        <Tag className="w-4 h-4 text-gold shrink-0" />
        <p className="text-[12px] sm:text-[13px] leading-snug">
          {offerBar.text}
          {offerBar.code && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(offerBar.code as string);
                setCopied(true);
                trackEvent("offer_bar_code_copy", { code: offerBar.code });
              }}
              className="ml-2 rounded-[2px] border border-gold/60 bg-gold/10 px-2 py-0.5 font-mono text-[11px] tracking-widest text-gold hover:bg-gold/20 transition-colors"
            >
              {copied ? "Copied!" : offerBar.code}
            </button>
          )}
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss offer"
          className="absolute right-3 text-white/60 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
