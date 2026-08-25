import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTours, tourPricing } from "@/lib/cms";
import { useSiteBrand } from "@/lib/brand";
import { trackBookingCtaClick, trackWhatsappClick } from "@/lib/analytics";
import { WhatsappIcon, whatsappHref } from "@/components/site/Whatsapp";

/** Mobile-only sticky booking bar; appears once the visitor scrolls past the hero. */
export function StickyBookBar() {
  const { data: tours = [] } = useTours();
  const { business, offerBar } = useSiteBrand();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const prices = tours.map((t) => tourPricing(t).current).filter((n) => n > 0);
  const from = prices.length ? Math.min(...prices) : null;

  if (!show) return null;

  return (
    <div
      className="md:hidden fixed inset-x-0 z-40 border-t border-ink/10 bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(30,58,95,0.12)]"
      style={{ bottom: offerBar.enabled ? 46 : 0 }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold text-ink leading-none">
            {from ? `From €${from}` : "Private tours"}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-body mt-1">
            per person · min 2
          </p>
        </div>
        <Link
          to="/tours"
          onClick={() => trackBookingCtaClick("sticky_bar_mobile")}
          className="flex-1 text-center rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest py-3"
        >
          Book now
        </Link>
        <a
          href={whatsappHref(
            business.whatsappPhone,
            "Hi Tuk Tuk 24! I'd like to book a private tuk-tuk tour in Lisbon.",
          )}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackWhatsappClick("sticky_bar_mobile")}
          aria-label="Message us on WhatsApp"
          className="w-11 h-11 shrink-0 grid place-items-center rounded-full bg-[#25D366] text-white"
        >
          <WhatsappIcon className="w-5 h-5" />
        </a>
      </div>
    </div>
  );
}
