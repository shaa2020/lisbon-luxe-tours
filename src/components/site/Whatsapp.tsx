import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useSiteBrand } from "@/lib/brand";
import { trackWhatsappClick } from "@/lib/analytics";
import { OfferBar } from "@/components/site/OfferBar";

/** Builds a wa.me link with a context-aware pre-filled message. */
export function whatsappHref(phone: string, message?: string) {
  const digits = (phone || "").replace(/[^\d]/g, "");
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function WhatsappIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.5 3.5A11.4 11.4 0 0 0 12.1 0C5.5 0 .2 5.3.2 11.9c0 2.1.6 4.2 1.6 6L0 24l6.3-1.6a11.9 11.9 0 0 0 5.8 1.5h.01c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.3-6.2-3.5-8.5ZM12.1 22a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.3-.4a9.9 9.9 0 1 1 18.4-5.5c0 5.5-4.5 10-10 10Zm5.5-7.4c-.3-.2-1.8-.9-2-1-.3-.1-.5-.2-.7.1-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.5.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.2-.7.2-1.4.2-1.5-.1-.2-.3-.3-.5-.4Z" />
    </svg>
  );
}

/** Small inline "Ask on WhatsApp" link for use inside booking panels and articles. */
export function WhatsappInline({
  message,
  location,
  className = "",
  children,
}: {
  message?: string;
  location: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { business, whatsappReplyLine } = useSiteBrand();
  return (
    <a
      href={whatsappHref(business.whatsappPhone, message)}
      target="_blank"
      rel="noreferrer"
      onClick={() => trackWhatsappClick(location)}
      className={
        className ||
        "inline-flex items-center justify-center gap-2 w-full py-3 rounded-[2px] border border-[#25D366] text-[#128C7E] text-[11px] uppercase tracking-[0.15em] font-medium hover:bg-[#25D366]/10 transition-colors"
      }
    >
      <WhatsappIcon className="w-4 h-4" />
      {children ?? "Ask a question on WhatsApp"}
      <span className="sr-only"> — {whatsappReplyLine}</span>
    </a>
  );
}

const PROMPT_KEY = "tt24_wa_prompt_dismissed";

export function WhatsappFab() {
  const { business, whatsappReplyLine } = useSiteBrand();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(PROMPT_KEY)) return;
    const t = setTimeout(() => setShowPrompt(true), 12000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem(PROMPT_KEY, "1");
    } catch {
      /* private mode */
    }
  };

  const message =
    typeof window !== "undefined"
      ? `Hi! I'm looking at ${window.location.pathname === "/" ? "your Lisbon tuk-tuk tours" : `https://tuktuk24lisbon.com${window.location.pathname}`} and have a question.`
      : "Hi! I have a question about your Lisbon tuk-tuk tours.";

  return (
    <>
      <OfferBar />

      {showPrompt && (
        <div className="fixed bottom-40 lg:bottom-24 left-4 lg:left-auto lg:right-6 z-40 max-w-[240px] rounded-xl bg-white border border-border shadow-[0_12px_40px_rgba(30,58,95,0.18)] p-3 animate-fade-in">
          <button
            onClick={dismiss}
            aria-label="Dismiss WhatsApp message"
            className="absolute -top-2 -right-2 size-6 rounded-full bg-ink text-white flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-[12px] leading-relaxed text-ink">
            Questions about dates, pickup or prices? Message us — {whatsappReplyLine.toLowerCase()}.
          </p>
          <a
            href={whatsappHref(business.whatsappPhone, message)}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackWhatsappClick("smart_prompt");
              dismiss();
            }}
            className="mt-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#128C7E]"
          >
            <WhatsappIcon className="w-3.5 h-3.5" /> Start chat
          </a>
        </div>
      )}

      <a
        href={whatsappHref(business.whatsappPhone, message)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        onClick={() => trackWhatsappClick("floating_button")}
        className="fixed bottom-24 lg:bottom-6 left-4 lg:left-auto lg:right-6 z-40 size-12 lg:size-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(37,211,102,0.4)] hover:scale-110 transition-transform"
      >
        <WhatsappIcon className="w-6 h-6 lg:w-7 lg:h-7" />
      </a>
    </>
  );
}
