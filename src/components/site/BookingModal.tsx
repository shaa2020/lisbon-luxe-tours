import { useState } from "react";
import { redirectToCheckout } from "@/lib/redirect-to-checkout";
import { idempotencyKey, newIdempotencySeed } from "@/lib/idempotency";
import { format } from "date-fns";
import { CalendarIcon, Users, Clock, MapPin, Check, CreditCard, Loader2 } from "lucide-react";
import { type Tour, tourPricing } from "@/lib/cms";
import { DurationOptions } from "@/components/site/DurationOptions";
import { activeOptions, optionPrice } from "@/lib/tour-options";
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
import { quote } from "@/lib/pricing";
import { useSiteBrand } from "@/lib/brand";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { trackBookingStart, trackWhatsappClick } from "@/lib/analytics";
import { PaypalWallet } from "@/components/site/PaypalWallet";
import { TipChips, PaySummary } from "@/components/site/TipChips";
import { PickupSelector } from "@/components/site/PickupSelector";
import { pickupSummary, type PickupSelection } from "@/lib/meetup-points";
import { useCheckoutDraft } from "@/lib/checkout-draft";
import { isTooSoon, TOO_SOON_MESSAGE } from "@/lib/booking-cutoff";
import { whatsappHref } from "@/components/site/Whatsapp";

const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

export function BookingModal({
  tour,
  open,
  onOpenChange,
  defaultDate,
  defaultGuests,
}: {
  tour: Tour | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate?: string | undefined;
  defaultGuests?: number | undefined;
}) {
  const { business, groupTiers, groupDiscountEnabled, hotelPickupFeeCents } = useSiteBrand();
  const checkoutFn = useServerFn(createCheckoutSession);
  const [tipCents, setTipCents] = useState(0);
  const [depositPct, setDepositPct] = useState(100);
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? new Date(`${defaultDate}T00:00:00`) : undefined,
  );
  const [time, setTime] = useState<string>("");
  const tooSoon = !!date && !!time && isTooSoon(format(date, "yyyy-MM-dd"), time);
  const [guests, setGuests] = useState(defaultGuests && defaultGuests >= 2 ? defaultGuests : 2);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pickupChoice, setPickupChoice] = useState<PickupSelection | null>(null);
  const pickup = pickupChoice?.type === "hotel";
  const [idempotencySeed] = useState(() => newIdempotencySeed("bk"));

  const [optionId, setOptionId] = useState<string | null>(null);

  const pickupPayload = {
    pickup,
    pickup_type: pickupChoice?.type ?? null,
    meetup_point_id: pickupChoice?.type === "meetup" ? pickupChoice.meetupPointId : null,
    pickup_place_name: pickupChoice?.type === "hotel" ? pickupChoice.placeName : null,
    pickup_address: pickupChoice?.type === "hotel" ? pickupChoice.address : null,
    pickup_latitude: pickupChoice?.type === "hotel" ? pickupChoice.latitude : null,
    pickup_longitude: pickupChoice?.type === "hotel" ? pickupChoice.longitude : null,
    pickup_place_id: pickupChoice?.type === "hotel" ? pickupChoice.placeId : null,
    // Changes with the booking details, so a second, different booking made in
    // the same visit is never merged into the first one.
    idempotency_key: idempotencyKey(idempotencySeed, [
      tour?.slug,
      optionId,
      date ? date.toISOString().slice(0, 10) : null,
      time,
      guests,
      name.trim(),
      contact.trim(),
      phone.trim(),
      pickupChoice?.type ?? null,
      pickupChoice?.type === "meetup" ? pickupChoice.meetupPointId : null,
      pickupChoice?.type === "hotel" ? pickupChoice.placeId || pickupChoice.address : null,
    ]),
  };

  // Saves the half-finished booking so it can be followed up if the guest
  // closes the window before paying.
  useCheckoutDraft(
    "modal",
    {
      tourSlug: tour?.slug ?? "",
      tourTitle: tour?.title ?? null,
      name,
      email: contact,
      phone,
      travelDate: date ? format(date, "yyyy-MM-dd") : null,
      travelTime: time || null,
      guests,
    },
    open && !!tour && !submitted,
  );

  if (!tour) return null;

  const options = activeOptions(tour.options);
  const selectedOption = options.find((o) => o.id === optionId) ?? options[0] ?? null;
  const basePricing = tourPricing(tour);
  const pricing = selectedOption
    ? { current: optionPrice(selectedOption), original: selectedOption.price }
    : basePricing;
  const durationLabel = selectedOption?.durationLabel || tour.duration;
  const perPersonPricing = tour.perPersonPricing !== false;
  const q = quote({
    perPerson: pricing.current,
    guests,
    perPersonPricing,
    tiers: groupTiers,
    tiersEnabled: groupDiscountEnabled,
    pickupFee: hotelPickupFeeCents / 100,
    pickupRequested: pickup,
  });
  const total = q.total;
  const payNow = depositPct >= 100 ? total : Math.round((total * depositPct)) / 100;
  const balanceDue = Math.round((total - payNow) * 100) / 100;

  const reset = () => {
    setDate(defaultDate ? new Date(`${defaultDate}T00:00:00`) : undefined);
    setTime(""); setGuests(defaultGuests && defaultGuests > 0 ? defaultGuests : 2);
    setOptionId(null);
    setPickupChoice(null);
    setName(""); setContact(""); setPhone(""); setSubmitted(false); setPaying(false);
    setTipCents(0); setDepositPct(100);
  };

  const handleClose = (v: boolean) => {
    if (!v) setTimeout(reset, 300);
    onOpenChange(v);
  };

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isPhone = (s: string) => s.replace(/[^\d]/g, "").length >= 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const waNumber = (business.whatsappPhone || "").replace(/[^\d]/g, "");
    const lines = [
      `Hello Tuk Tuk 24! I'd like to book a tour.`,
      ``,
      `Tour: ${tour.title}`,
      `Duration: ${durationLabel}`,
      date ? `Date: ${format(date, "EEEE, d MMM yyyy")}` : null,
      time ? `Time: ${time}` : null,
      `Guests: ${guests}`,
      pickupChoice ? `Pickup: ${pickupSummary(pickupChoice)}` : null,
      pickupChoice?.type === "hotel" ? `Address: ${pickupChoice.address}` : null,
      pickup ? `Hotel pickup fee: +€${(hotelPickupFeeCents / 100).toFixed(0)}` : null,
      `Estimated total: €${total}`,
      ``,
      `Name: ${name}`,
      `Contact: ${contact}`,
      `WhatsApp: ${phone}`,
    ].filter(Boolean).join("\n");
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`;
    trackWhatsappClick("booking_modal");
    window.open(url, "_blank", "noopener,noreferrer");
    setSubmitted(true);
  };

  const handlePay = async () => {
    if (!date || !time || !name || !contact) {
      toast.error("Please complete date, time, name and email.");
      return;
    }
    if (!isPhone(phone)) {
      toast.error("Enter your WhatsApp number with country code.");
      return;
    }
    if (!isEmail(contact)) {
      toast.error("Enter a valid email address to pay by card.");
      return;
    }
    setPaying(true);
    trackBookingStart(tour, total);
    try {
      const res = await checkoutFn({
        data: {
          tour_slug: tour.slug,
          tour_title: tour.title,
          customer_name: name,
          email: contact,
          phone: phone.trim(),
          travel_date: date ? format(date, "yyyy-MM-dd") : null,
          time,
          guests,
          amount: total * 100,
          image_url: tour.image?.startsWith("http") ? tour.image : null,
          tour_option_id: selectedOption?.id ?? null,
          tip_cents: tipCents,
          deposit_pct: depositPct,
          ...pickupPayload,
        },
      });
      if (res.mode === "pay" && res.url) {
        redirectToCheckout(res.url);
      } else {
        setPaying(false);
        toast.success(res.message || "Request received — we'll confirm by email shortly.");
      }
    } catch (err) {
      setPaying(false);
      toast.error((err as Error).message || "Could not start checkout.");
    }
  };

  const contactValid = !!date && !!time && !!name.trim() && isEmail(contact) && isPhone(phone);

  const startWalletOrder = async (): Promise<string | null> => {
    if (!contactValid) {
      toast.error("Complete date, time and your contact details first.");
      return null;
    }
    const res = await checkoutFn({
      data: {
        tour_slug: tour.slug,
        tour_title: tour.title,
        customer_name: name,
        email: contact,
        phone: phone.trim(),
        travel_date: date ? format(date, "yyyy-MM-dd") : null,
        time,
        guests,
        amount: total * 100,
        image_url: tour.image?.startsWith("http") ? tour.image : null,
        tour_option_id: selectedOption?.id ?? null,
        tip_cents: tipCents,
        deposit_pct: depositPct,
        ...pickupPayload,
      },
    });
    if (res.mode !== "pay") {
      toast.success(res.message || "Request received — we'll confirm by email shortly.");
      return null;
    }
    return res.sessionId ?? null;
  };

  const finishWalletOrder = (orderId: string) => {
    window.location.assign(`/booking/success?session_id=${encodeURIComponent(orderId)}`);
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
              <p><span className="text-ink/50">Duration ·</span> <span className="text-ink">{durationLabel}</span></p>
              {date && <p><span className="text-ink/50">Date ·</span> <span className="text-ink">{format(date, "EEEE, d MMMM yyyy")}</span></p>}
              {time && <p><span className="text-ink/50">Time ·</span> <span className="text-ink">{time}</span></p>}
              <p><span className="text-ink/50">Guests ·</span> <span className="text-ink">{guests}</span></p>
              {pickup && <p><span className="text-ink/50">Hotel pickup ·</span> <span className="text-ink">Yes (+€{(hotelPickupFeeCents / 100).toFixed(0)})</span></p>}
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
                  <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-gold" />{durationLabel}</div>
                  <div className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-gold" />{tour.tagline}</div>
                  <div className="flex items-center gap-2.5"><span className="text-gold text-base">★</span>4.9 · private tour</div>
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

              {/* Cancellation notice */}
              <p className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-[12px] leading-snug text-emerald-800">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-semibold">Free cancellation</span> up to 24 hours before
                  your tour. Later cancellations are non-refundable.
                </span>
              </p>

              {/* Duration options (only for multi-duration tours) */}
              {options.length > 0 && (
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-ink/60 block mb-2">Duration</label>
                  <DurationOptions
                    compact
                    options={options}
                    selectedId={selectedOption?.id ?? null}
                    onSelect={setOptionId}
                  />
                </div>
              )}

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
                 <label className="mt-3 block text-[11px] text-body">
                   Or choose any time
                   <input
                     type="time"
                     step={60}
                     value={time}
                     onChange={(event) => setTime(event.target.value)}
                     className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-cloud/40 px-4 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
                   />
                 </label>
              </div>
              {tooSoon && (
                <div className="rounded-lg border border-gold/40 bg-gold/5 p-3 text-[12px] text-ink">
                  <p>{TOO_SOON_MESSAGE}</p>
                  <a
                    href={whatsappHref(business.whatsappPhone, `Hi TukTuk24! I'd like to check last-minute availability for ${tour.title} on ${date ? format(date, "d MMM") : ""} at ${time} for ${guests} guests. Do you have a tuk-tuk available?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 font-semibold text-gold underline"
                  >
                    Check availability on WhatsApp
                  </a>
                </div>
              )}

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
                      onClick={() => setGuests(Math.max(2, guests - 1))}
                      className="w-8 h-8 rounded-full border border-border text-ink hover:border-gold hover:text-gold transition"
                    >−</button>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(20, guests + 1))}
                      className="w-8 h-8 rounded-full border border-border text-ink hover:border-gold hover:text-gold transition"
                    >+</button>
                  </div>
                </div>
                <p className="text-[11px] text-body mt-2">
                  {perPersonPricing
                    ? `€${pricing.current} per person · minimum 2 guests`
                    : `€${pricing.current} per transfer · price per vehicle`}
                </p>
              </div>

              {/* Pickup — meetup point (included) or hotel pickup (chargeable) */}
              <PickupSelector
                tourSlug={tour.slug}
                pickupFeeCents={hotelPickupFeeCents}
                value={pickupChoice}
                onChange={setPickupChoice}
              />

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
                  placeholder="Email (required for card payment)"
                  className="px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
                />
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="WhatsApp number (with country code)"
                  className="col-span-2 px-4 py-3 rounded-lg bg-cloud/40 border border-border text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:border-gold"
                />
              </div>

              {/* Total + submit */}
              <div className="mt-2 pt-5 border-t border-border flex flex-col gap-3">
                <div className="flex justify-between text-xs text-body">
                  <span>
                    {perPersonPricing
                      ? `€${pricing.current} per person × ${q.guests} guests`
                      : "Private transfer"}
                  </span>
                  <span>€{q.guestsSubtotal.toFixed(2)}</span>
                </div>
                {q.groupDiscount > 0 && (
                  <div className="flex justify-between text-xs text-gold">
                    <span>Group discount ({q.guests} guests, −{q.tierPct}%)</span>
                    <span>−€{q.groupDiscount.toFixed(2)}</span>
                  </div>
                )}
                {q.pickup > 0 && (
                  <div className="flex justify-between text-xs text-body">
                    <span>Hotel pickup &amp; drop-off</span>
                    <span>€{q.pickup.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-body">Est. total</p>
                    <p className="font-display font-bold text-3xl text-gold leading-none">€{total}</p>
                  </div>
                  <p className="text-[10px] text-body text-right max-w-[160px]">
                    Reserve via WhatsApp and pay later, or pay instantly with PayPal.
                  </p>
                </div>
                {/* Pay in full or leave a deposit */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-body font-bold mb-2">Payment option</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 50, 30, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setDepositPct(p)}
                        className={`py-2.5 min-h-[44px] text-[11px] rounded-lg border transition-colors ${
                          depositPct === p
                            ? "border-gold bg-gold/10 text-ink font-semibold"
                            : "border-border text-ink hover:border-gold"
                        }`}
                      >
                        {p === 100 ? "Full" : `${p}%`}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-body">
                    {balanceDue > 0
                      ? `Pay €${payNow.toFixed(2)} now, €${balanceDue.toFixed(2)} on the day.`
                      : "Paying the full amount now. Minimum deposit is 20%."}
                  </p>
                </div>
                <TipChips value={tipCents} onChange={setTipCents} className="mt-1" />
                <PaySummary
                  fareLabel={depositPct >= 100 ? "Tour payment (full amount)" : `Tour deposit (${depositPct}%)`}
                  fareCents={Math.round(payNow * 100)}
                  tipCents={tipCents}
                  balanceCents={Math.round(balanceDue * 100)}
                />
                <div className="grid gap-2">
                  <button
                    type="submit"
                    disabled={paying || !date || !time || !name || !contact || !isPhone(phone)}
                    className="w-full px-5 py-3.5 rounded-full bg-[#25D366] text-white text-[12px] font-semibold uppercase tracking-widest hover:bg-ink transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_15px_rgba(37,211,102,0.35)]"
                  >
                    Reserve via WhatsApp
                  </button>
                </div>

                <PaypalWallet
                  amount={payNow + tipCents / 100}
                  label={tour.title}
                  disabled={paying || !contactValid || tooSoon}
                  createOrder={startWalletOrder}
                  onPaid={finishWalletOrder}
                />

              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
