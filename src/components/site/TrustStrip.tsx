import { ShieldCheck, RotateCcw, Wallet, Leaf } from "lucide-react";

const ITEMS = [
  {
    Icon: ShieldCheck,
    k: "Licensed Lisbon operator",
    v: "Registered local company, insured tuk-tuks",
  },
  {
    Icon: RotateCcw,
    k: "Free cancellation",
    v: "Full refund up to 24h before your tour",
  },
  {
    Icon: Wallet,
    k: "Book with 20% deposit",
    v: "Pay the balance on the day of the tour",
  },
  {
    Icon: Leaf,
    k: "100% electric & private",
    v: "Quiet, fume-free, your group only",
  },
];

/**
 * Permanent trust band. Always visible — it answers the questions travellers
 * ask before they are willing to book with a company abroad.
 */
export function TrustStrip() {
  return (
    <section className="border-y border-ink/10 bg-white">
      <div className="container-x py-7 md:py-9 grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-7">
        {ITEMS.map(({ Icon, k, v }) => (
          <div key={k} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-gold/10">
              <Icon className="h-[18px] w-[18px] text-gold" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-[13.5px] md:text-[15px] font-bold text-ink leading-tight">
                {k}
              </p>
              <p className="text-[11.5px] md:text-[12px] text-body mt-1 leading-snug">{v}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
