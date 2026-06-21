import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Users, Clock, Check, CreditCard, Loader2, ShieldCheck, Globe2, MapPin } from "lucide-react";
import { type Tour, tourPricing } from "@/lib/cms";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { toast } from "sonner";

const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

export function TourBookingPanel({ tour, compact = false }: { tour: Tour; compact?: boolean }) {
  const checkoutFn = useServerFn(createCheckoutSession);
  const pricing = tourPricing(tour);

  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>(TIME_SLOTS[0]);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [paying, setPaying] = useState(false);

  const perAdult = pricing.current / 2; // base price covers 2
  const extras = Math.max(0, guests - 2) * 35;
  const total = pricing.current + extras;
  const unit = total / guests;

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const canContinue = !!date && !!time && guests > 0;

  const handleContinue = async () => {
    if (!canContinue) {
      toast.error("Pick a date and time first.");
      return;
    }
    if (!showContact) {
      setShowContact(true);
      return;
    }
    if (!name.trim() || !isEmail(email)) {
      toast.error("Enter your name and a valid email.");
      return;
    }
    setPaying(true);
    try {
      const res = await checkoutFn({
        data: {
          tour_slug: tour.slug,
          tour_title: tour.title,
          customer_name: name,
          email,
          travel_date: date ? format(date, "yyyy-MM-dd") : null,
          time,
          guests,
          amount: total * 100,
          image_url: tour.image?.startsWith("http") ? tour.image : null,
        },
      });
      window.location.href = res.url;
    } catch (err) {
      setPaying(false);
      toast.error((err as Error).message || "Could not start checkout.");
    }
  };

  return (
    <div className={cn(
      "bg-white text-ink",
      !compact && "rounded-2xl border border-border shadow-[0_20px_50px_rgba(30,58,95,0.10)] p-6",
    )}>
      {/* Price header */}
      <div className="flex items-baseline gap-3 flex-wrap mb-1">
        <p className="font-display font-bold text-4xl text-gold leading-none">€{pricing.current}</p>
        {pricing.onSale && (
          <>
            <span className="font-display text-xl text-body/50 line-through leading-none">€{pricing.original}</span>
            <span className="bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
              −{pricing.discountPct}%
            </span>
          </>
        )}
      </div>
      <p className="text-body text-xs mb-5">Private group · base 2 guests · +€35 per extra</p>

      {/* Trust list */}
      <ul className="space-y-2 mb-5 text-[13px] text-ink">
        <li className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-gold shrink-0" /> Duration: {tour.duration}</li>
        <li className="flex items-center gap-2.5"><Globe2 className="w-4 h-4 text-gold shrink-0" /> Guide: English / Português</li>
        <li className="flex items-center gap-2.5"><ShieldCheck className="w-4 h-4 text-gold shrink-0" /> Free cancellation up to 24h</li>
        <li className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-gold shrink-0" /> Hotel pick-up included</li>
      </ul>

      <div className="border-t border-border my-5" />

      {/* Date */}
      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">Select a date</label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-cloud/40 text-sm text-left hover:border-gold transition text-ink",
              !date && "text-ink/50",
            )}
          >
            <CalendarIcon className="w-4 h-4 text-gold" />
            {date ? format(date, "EEEE, d MMM yyyy") : "Pick a date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border-border z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Time */}
      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2 mt-4">Starting time</label>
      <div className="grid grid-cols-3 gap-2">
        {TIME_SLOTS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTime(t)}
            className={cn(
              "py-2.5 rounded-lg border text-sm font-medium transition",
              time === t
                ? "bg-gold text-white border-gold"
                : "bg-cloud/40 border-border text-ink hover:border-gold",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Guests */}
      <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2 mt-4">Guests</label>
      <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-cloud/40">
        <span className="flex items-center gap-2.5 text-sm text-ink">
          <Users className="w-4 h-4 text-gold" />
          {guests} {guests === 1 ? "Adult" : "Adults"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGuests(Math.max(1, guests - 1))}
            className="w-8 h-8 rounded-full border border-border text-ink hover:border-gold hover:text-gold transition"
          >−</button>
          <button
            type="button"
            onClick={() => setGuests(Math.min(7, guests + 1))}
            className="w-8 h-8 rounded-full border border-border text-ink hover:border-gold hover:text-gold transition"
          >+</button>
        </div>
      </div>

      {/* Contact (revealed) */}
      {showContact && (
        <div className="mt-4 space-y-2 animate-[fade-up_0.3s_var(--ease-out-expo)_both]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email for booking confirmation"
            className="w-full px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
          />
        </div>
      )}

      <div className="border-t border-border my-5" />

      {/* Total */}
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-body">Total</span>
        <span className="font-display font-bold text-3xl text-gold leading-none">€{total.toFixed(2)}</span>
      </div>
      <p className="text-[12px] text-body">{guests} {guests === 1 ? "Adult" : "Adults"} × €{unit.toFixed(2)}</p>
      <p className="text-[11px] text-body/70 mt-1">All taxes and fees included</p>

      {/* Continue */}
      <button
        onClick={handleContinue}
        disabled={paying || !canContinue}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 bg-gold text-white py-3.5 rounded-full text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition shadow-[0_8px_20px_rgba(43,182,247,0.35)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {paying ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
        ) : showContact ? (
          <><CreditCard className="w-4 h-4" /> Pay €{total.toFixed(2)}</>
        ) : (
          <>Continue <Check className="w-4 h-4" /></>
        )}
      </button>

      {!showContact && (
        <p className="text-[11px] text-body/70 text-center mt-3">Reserve now · pay securely on the next step</p>
      )}
    </div>
  );
}
