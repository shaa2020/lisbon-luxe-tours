import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Users, Clock, MapPin, Check } from "lucide-react";
import type { Tour } from "@/data/tours";
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
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!tour) return null;

  const total = tour.priceFrom + Math.max(0, guests - 2) * 35;

  const reset = () => {
    setDate(undefined); setTime(""); setGuests(2);
    setName(""); setContact(""); setSubmitted(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(reset, 300);
    onOpenChange(v);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-[#0b0b09] border border-white/15 text-white">
        {submitted ? (
          <div className="p-10 md:p-14 text-center">
            <div className="w-16 h-16 rounded-full bg-gold/20 border border-gold grid place-items-center mx-auto mb-6">
              <Check className="w-7 h-7 text-gold" />
            </div>
            <DialogHeader>
              <DialogTitle className="font-serif italic text-3xl md:text-4xl text-white">
                Request received.
              </DialogTitle>
              <DialogDescription className="text-white/65 mt-3">
                Your concierge will confirm availability within 4 hours.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-8 inline-flex flex-col gap-2 text-sm text-white/70 text-left border border-white/10 rounded-xl p-5">
              <p><span className="text-white/40">Tour ·</span> {tour.title}</p>
              {date && <p><span className="text-white/40">Date ·</span> {format(date, "EEEE, d MMMM yyyy")}</p>}
              {time && <p><span className="text-white/40">Time ·</span> {time}</p>}
              <p><span className="text-white/40">Guests ·</span> {guests}</p>
              <p><span className="text-white/40">Est. total ·</span> <span className="text-gold">€{total}</span></p>
            </div>
            <button
              onClick={() => handleClose(false)}
              className="mt-8 px-8 py-3 rounded-full bg-gold text-ink eyebrow font-medium hover:bg-white transition"
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
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/65 to-black/90" />
              <div className="relative flex flex-col h-full">
                <span className="eyebrow text-gold mb-3">{tour.category}</span>
                <h3 className="font-serif italic text-3xl md:text-4xl text-white leading-tight mb-4">
                  {tour.title}
                </h3>
                <div className="mt-auto space-y-2.5 text-sm text-white/80">
                  <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-gold" />{tour.duration}</div>
                  <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-gold" />{tour.tagline}</div>
                  <div className="flex items-center gap-2.5"><span className="text-gold text-base">★</span>4.9 · private group</div>
                </div>
              </div>
            </div>

            {/* Right — booking form */}
            <form onSubmit={handleSubmit} className="p-7 md:p-8 flex flex-col gap-5">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-serif text-2xl text-white">Quick Booking</DialogTitle>
                <DialogDescription className="text-white/55 text-sm">
                  Reserve in under a minute — no payment yet.
                </DialogDescription>
              </DialogHeader>

              {/* Date */}
              <div>
                <label className="eyebrow text-white/60 block mb-2">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 text-sm text-left hover:border-gold/50 transition",
                        !date && "text-white/50"
                      )}
                    >
                      <CalendarIcon className="w-4 h-4 text-gold" />
                      {date ? format(date, "EEEE, d MMM yyyy") : "Pick a date"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#0b0b09] border-white/15" align="start">
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
                <label className="eyebrow text-white/60 block mb-2">Start time</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setTime(t)}
                      className={cn(
                        "py-2.5 rounded-lg border text-sm font-mono transition",
                        time === t
                          ? "bg-gold text-ink border-gold"
                          : "bg-white/5 border-white/15 text-white/70 hover:border-gold/50"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div>
                <label className="eyebrow text-white/60 block mb-2">Guests</label>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/15 bg-white/5">
                  <span className="flex items-center gap-2.5 text-sm">
                    <Users className="w-4 h-4 text-gold" />
                    {guests} {guests === 1 ? "guest" : "guests"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-8 h-8 rounded-full border border-white/20 text-white hover:border-gold hover:text-gold transition"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(7, guests + 1))}
                      className="w-8 h-8 rounded-full border border-white/20 text-white hover:border-gold hover:text-gold transition"
                    >+</button>
                  </div>
                </div>
                <p className="text-[11px] text-white/40 mt-2">Includes base of 2 · €35 per additional guest · max 7</p>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold"
                />
                <input
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Email or WhatsApp"
                  className="px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-gold"
                />
              </div>

              {/* Total + submit */}
              <div className="mt-2 pt-5 border-t border-white/10 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/40">Est. total</p>
                  <p className="font-serif text-3xl text-gold leading-none">€{total}</p>
                </div>
                <button
                  type="submit"
                  disabled={!date || !time || !name || !contact}
                  className="px-7 py-3.5 rounded-full bg-gold text-ink eyebrow font-medium hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Request to Book →
                </button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
