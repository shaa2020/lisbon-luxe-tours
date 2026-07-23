import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Globe2, ShieldCheck, MapPin, Loader2, Minus, Plus, ChevronDown } from "lucide-react";
import { type Tour, tourPricing } from "@/lib/cms";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { CANCELLATION_POLICY_FULL } from "@/lib/cancellation";

const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

export function TourBookingPanel({ tour }: { tour: Tour; compact?: boolean }) {
  const checkoutFn = useServerFn(createCheckoutSession);
  const pricing = tourPricing(tour);

  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>(TIME_SLOTS[1]);
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [paying, setPaying] = useState(false);

  const extras = Math.max(0, guests - 2) * 35;
  const total = pricing.current + extras;
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const canContinue = !!date && !!time && guests > 0;

  const handleContinue = async () => {
    if (!canContinue) { toast.error("Pick a date and time first."); return; }
    if (!showContact) { setShowContact(true); return; }
    if (!name.trim() || !isEmail(email)) { toast.error("Enter your name and a valid email."); return; }
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
    <div className="bg-paper border border-border shadow-[0_4px_24px_rgba(30,58,95,0.06)] rounded-[4px] overflow-hidden">
      {/* Price header */}
      <div className="p-6 pb-4">
        <div className="flex justify-between items-baseline mb-1.5">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-3xl text-ink leading-none">€{pricing.current}</span>
            {pricing.onSale && (
              <span className="text-sm text-body line-through decoration-gold/40">€{pricing.original}</span>
            )}
          </div>
          {pricing.onSale && (
            <span className="px-2.5 py-1 bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-semibold rounded-full">
              −{pricing.discountPct}%
            </span>
          )}
        </div>
        <p className="text-body text-xs tracking-tight">per private group · up to 7 guests</p>
      </div>

      <div className="px-6"><div className="h-px bg-border/60" /></div>

      {/* Trust details */}
      <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-2">
        <Detail icon={<Clock className="w-4 h-4" />} label={tour.duration} />
        <Detail icon={<Globe2 className="w-4 h-4" />} label="EN / PT Guide" />
        <Detail
          icon={<ShieldCheck className="w-4 h-4" />}
          label="Free cancel · 24h"
          title={CANCELLATION_POLICY_FULL}
        />
        <Detail icon={<MapPin className="w-4 h-4" />} label="Hotel Pickup" />
      </div>

      <div className="px-6 pb-2">
        <div className="flex gap-2.5 p-3 bg-gold/5 border border-gold/20 rounded-[2px]">
          <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-body">
            <span className="text-ink font-medium">Free cancellation</span> up to 24 hours before the tour. Cancellations within 24 hours are non-refundable. If you reschedule and later cancel, refund is calculated from the <span className="text-ink font-medium">original booked date</span>.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 space-y-5">
        {/* Date */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">Select Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 border border-border bg-paper rounded-[2px] text-sm text-ink hover:border-gold transition-colors",
                  !date && "text-body",
                )}
              >
                <span className="inline-flex items-center gap-2.5">
                  <CalendarIcon className="w-4 h-4 text-gold" />
                  {date ? format(date, "EEEE, MMM d, yyyy") : "Pick a date"}
                </span>
                <ChevronDown className="w-4 h-4 text-body" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-paper border-border z-50" align="start">
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
        </div>

        {/* Time */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">Start Time</label>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={cn(
                  "py-2.5 text-xs rounded-[2px] border transition-colors",
                  time === t
                    ? "border-gold bg-gold/5 text-ink font-medium"
                    : "border-border text-ink hover:border-gold",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Guests */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">Travelers</label>
          <div className="flex items-center justify-between px-4 py-3 border border-border bg-paper rounded-[2px]">
            <span className="text-sm text-ink">
              {guests} {guests === 1 ? "Guest" : "Guests"}
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                aria-label="Decrease guests"
                className="w-6 h-6 flex items-center justify-center text-body hover:text-ink transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-ink w-4 text-center">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests(Math.min(7, guests + 1))}
                aria-label="Increase guests"
                className="w-6 h-6 flex items-center justify-center text-body hover:text-ink transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {extras > 0 && (
            <p className="text-[11px] text-body mt-1.5">+€{extras} for {guests - 2} extra {guests - 2 === 1 ? "guest" : "guests"}</p>
          )}
        </div>

        {/* Contact (revealed) */}
        {showContact && (
          <div className="space-y-2 animate-fade-in">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email for confirmation"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
            />
          </div>
        )}
      </div>

      {/* Total + CTA */}
      <div className="bg-cloud/40 border-t border-border p-6 space-y-4">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-body">Total Amount</span>
          <span className="font-display text-2xl text-ink leading-none">€{total.toFixed(2)}</span>
        </div>
        <button
          onClick={handleContinue}
          disabled={paying || !canContinue}
          className="w-full bg-ink text-paper py-4 rounded-[2px] font-medium tracking-[0.2em] text-xs uppercase hover:bg-gold transition-colors shadow-[0_8px_20px_rgba(30,58,95,0.18)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {paying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting…</>
          ) : showContact ? (
            <>Pay €{total.toFixed(2)}</>
          ) : (
            <>Continue to Booking</>
          )}
        </button>
        <p className="text-[10px] text-center text-body italic">
          {showContact ? "Secure checkout via Stripe" : "No payment required yet"}
        </p>
      </div>
    </div>
  );
}

function Detail({ icon, label, title }: { icon: React.ReactNode; label: string; title?: string }) {
  return (
    <div className="flex items-center gap-3" title={title}>
      <div className="w-4 h-4 text-gold shrink-0">{icon}</div>
      <span className="text-xs text-ink font-medium truncate">{label}</span>
    </div>
  );
}
