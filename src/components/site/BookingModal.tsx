import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Users, Clock, MapPin, Check, CreditCard, Loader2 } from "lucide-react";
import type { Tour } from "@/lib/cms";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSiteBrand } from "@/lib/brand";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { toast } from "sonner";

const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

export function BookingModal({
  tour,
  open,
  onOpenChange,
}: {
  tour: Tour | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { business } = useSiteBrand();
  const checkoutFn = useServerFn(createCheckoutSession);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [paying, setPaying] = useState(false);

  if (!tour) return null;

  const total = tour.priceFrom + Math.max(0, guests - 2) * 35;

  const reset = () => {
    setDate(undefined); setTime(""); setGuests(2);
    setName(""); setContact(""); setSubmitted(false); setPaying(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(reset, 300);
    onOpenChange(v);
  };

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waNumber = (business.whatsappPhone || "").replace(/[^\d]/g, "");
    const lines = [
      `Hello Tuk Tuk 24! I'd like to book a tour.`,
      ``,
      `Tour: ${tour.title}`,
      date ? `Date: ${format(date, "EEEE, d MMM yyyy")}` : null,
      time ? `Time: ${time}` : null,
      `Guests: ${guests}`,
      `Estimated total: €${total}`,
      ``,
      `Name: ${name}`,
      `Contact: ${contact}`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const handlePay = async () => {
    if (!date || !time || !name || !contact) {
      toast.error("Please complete date, time, name and email.");
      return;
    }
    if (!isEmail(contact)) {
      toast.error("Enter a valid email address to pay by card.");
      return;
    }
    setPaying(true);
    try {
      const res = await checkoutFn({
        data: {
          tour_slug: tour.slug,
          tour_title: tour.title,
          customer_name: name,
          email: contact,
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-y-auto max-h-[92vh] bg-white border border-border text-ink">
        {submitted ? (
          <div className="p-10 md:p-14 text-center">
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold grid place-items-center mx-auto mb-6">
              <Check className="w-7 h-7 text-gold" />
            </div>
            <DialogHeader>
              <DialogTitle className="font-display text-3xl md:text-4xl text-ink">
                Opening WhatsApp…
              </DialogTitle>
              <DialogDescription className="text-body mt-3">
                Send the prefilled message and we'll confirm within minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 inline-flex flex-col gap-2 text-sm text-body text-left border border-border rounded-xl p-5 bg-cloud/40">
              <p><span className="text-ink/50">Tour ·</span> <span className="text-ink font-medium">{tour.title}</span></p>
              {date && <p><span className="text-ink/50">Date ·</span> <span className="text-ink">{format(date, "EEEE, d MMMM yyyy")}</span></p>}
              {time && <p><span className="text-ink/50">Time ·</span> <span className="text-ink">{time}</span></p>}
              <p><span className="text-ink/50">Guests ·</span> <span className="text-ink">{guests}</span></p>
              <p><span className="text-ink/50">Est. total ·</span> <span className="text-gold font-semibold">€{total}</span></p>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="mt-8 px-8 py-3 rounded-full bg-gold text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-[1fr_1.2fr]">
            {/* Left — tour summary */}
            <div
              className="relative p-7 min-h-[220px] md:min-h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${tour.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/55 to-ink/85" />
              <div className="relative flex flex-col h-full text-white">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-3">{tour.category}</span>
                <h3 className="font-display font-bold text-2xl md:text-3xl text-white leading-tight mb-4">
                  {tour.title}
                </h3>
                <div className="mt-auto space-y-2.5 text-sm text-white/85">
                  <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-gold" />{tour.duration}</div>
                  <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-gold" />{tour.tagline}</div>
                  <div className="flex items-center gap-2.5"><span className="text-gold text-base">★</span>4.9 · private group</div>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <form onSubmit={handleSubmit} className="p-7 md:p-8 flex flex-col gap-5">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-display text-2xl text-ink">Quick Booking</DialogTitle>
                <DialogDescription className="text-body text-sm">
                  Reserve in under a minute — no payment yet.
                </DialogDescription>
              </DialogHeader>

              {/* Date */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-cloud/40 text-sm text-left hover:border-gold transition text-ink",
                        !date && "text-ink/50"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 text-gold" />
                      {date ? format(date, "EEEE, d MMM yyyy") : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white border-border" align="start">
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

              {/* Time slots */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">Start time</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(
                        "py-2.5 rounded-lg border text-sm font-medium transition",
                        time === t
                          ? "bg-gold text-white border-gold"
                          : "bg-cloud/40 border-border text-ink hover:border-gold"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">Guests</label>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-cloud/40">
                  <span className="flex items-center gap-2.5 text-sm text-ink">
                    <Users className="w-4 h-4 text-gold" />
                    {guests} {guests === 1 ? "guest" : "guests"}
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
                <p className="text-[11px] text-body mt-2">Includes base of 2 · €35 per additional guest · max 7</p>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
                />
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email or WhatsApp"
                  className="px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
                />
              </div>

              {/* Total + submit */}
              <div className="mt-2 pt-5 border-t border-border flex flex-col sm:flex-row gap-4 sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-body">Est. total</p>
                  <p className="font-display font-bold text-3xl text-gold leading-none">€{total}</p>
                </div>
                <button
                  type="submit"
                  disabled={!date || !time || !name || !contact}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_15px_rgba(37,211,102,0.35)]"
                >
                  Book via WhatsApp →
                </button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
