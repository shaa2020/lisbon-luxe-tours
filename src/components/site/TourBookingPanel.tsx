import { useState } from "react";
import { redirectToCheckout } from "@/lib/redirect-to-checkout";
import { idempotencyKey, newIdempotencySeed } from "@/lib/idempotency";
import { useQuery } from "@tanstack/react-query";
import { getDayAvailability, requestBooking } from "@/lib/availability.functions";
import { format } from "date-fns";
import { CalendarIcon, Clock, Globe2, ShieldCheck, MapPin, Loader2, Minus, Plus, ChevronDown, Check, RotateCcw, Wallet, Umbrella, Lock } from "lucide-react";
import { type Tour, tourPricing } from "@/lib/cms";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession } from "@/lib/checkout.functions";
import { toast } from "sonner";
import { CANCELLATION_POLICY_FULL } from "@/lib/cancellation";
import { useSiteBrand } from "@/lib/brand";
import { PaypalWallet } from "@/components/site/PaypalWallet";
import { PickupSelector } from "@/components/site/PickupSelector";
import { pickupSummary, type PickupSelection } from "@/lib/meetup-points";
import { trackBookingStart, trackBookingCtaClick, trackDiscountApplied, trackDiscountRejected } from "@/lib/analytics";
import { checkDiscountCode } from "@/lib/discounts.functions";
import { WhatsappInline } from "@/components/site/Whatsapp";
import { StarRating } from "@/components/site/StarRating";
import { useReviewStatsBySlug } from "@/lib/reviews";
import { quote, MIN_GUESTS, MAX_GUESTS } from "@/lib/pricing";
import { DurationOptions } from "@/components/site/DurationOptions";
import { activeOptions, optionPrice, type TourOption } from "@/lib/tour-options";
import { useCheckoutDraft, readResumeParams } from "@/lib/checkout-draft";
import { useEffect } from "react";

const TIME_SLOTS = ["09:00", "10:30", "13:00", "15:00", "17:00", "18:30"];

export function TourBookingPanel({
  tour,
  selectedOption,
  onSelectOption,
}: {
  tour: Tour;
  compact?: boolean;
  /** Selected duration option, for tours that offer several. */
  selectedOption?: TourOption | null;
  onSelectOption?: (id: string) => void;
}) {
  const checkoutFn = useServerFn(createCheckoutSession);
  const options = activeOptions(tour.options);
  const chosen = selectedOption ?? options[0] ?? null;
  const basePricing = tourPricing(tour);
  // A selected duration option overrides the tour's own price and duration.
  const pricing = chosen
    ? {
        original: chosen.price,
        sale: chosen.salePrice,
        current: optionPrice(chosen),
        onSale: chosen.salePrice != null,
        discountPct: chosen.salePrice != null
          ? Math.round(((chosen.price - chosen.salePrice) / chosen.price) * 100)
          : 0,
      }
    : basePricing;
  const durationLabel = chosen?.durationLabel || tour.duration;
  const { hotelPickupFeeCents, groupTiers, groupDiscountEnabled } = useSiteBrand();
  const perPersonPricing = tour.perPersonPricing !== false;
  const minGuests = perPersonPricing ? MIN_GUESTS : 1;
  const pickupFee = Math.max(0, Math.round((hotelPickupFeeCents || 0) / 100));

  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>(TIME_SLOTS[1]);
  const [guests, setGuests] = useState(tour.perPersonPricing === false ? 1 : MIN_GUESTS);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [showContact, setShowContact] = useState(false);
  const [paying, setPaying] = useState(false);
  const [pickupChoice, setPickupChoice] = useState<PickupSelection | null>(null);
  const pickup = pickupChoice?.type === "hotel";
  const [idempotencySeed] = useState(() => newIdempotencySeed("tp"));
  const [depositPct, setDepositPct] = useState(100);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; cents: number } | null>(null);
  const [checkingPromo, setCheckingPromo] = useState(false);
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
      tour.slug,
      chosen?.id ?? null,
      date ? format(date, "yyyy-MM-dd") : null,
      time,
      guests,
      name.trim(),
      email.trim(),
      phone.trim(),
      depositPct,
      promo?.code ?? null,
      pickupChoice?.type ?? null,
      pickupChoice?.type === "meetup" ? pickupChoice.meetupPointId : null,
      pickupChoice?.type === "hotel" ? pickupChoice.placeId || pickupChoice.address : null,
    ]),
  };
  const checkPromoFn = useServerFn(checkDiscountCode);
  const { data: reviewStats } = useReviewStatsBySlug();
  const rating = reviewStats?.[tour.slug];

  const [requesting, setRequesting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const requestFn = useServerFn(requestBooking);
  const availabilityFn = useServerFn(getDayAvailability);

  const dateKey = date ? format(date, "yyyy-MM-dd") : null;
  const { data: availability } = useQuery({
    queryKey: ["availability", dateKey],
    enabled: !!dateKey,
    queryFn: () => availabilityFn({ data: { date: dateKey as string } }),
  });
  const slotInfo = (t: string) => availability?.slots.find((s) => s.time === t);

  const q = quote({
    perPerson: pricing.current,
    guests,
    perPersonPricing,
    pickupFee,
    pickupRequested: pickup,
    tiers: groupTiers,
    tiersEnabled: groupDiscountEnabled,
  });
  const guestsTotal = q.guestsSubtotal;
  const pickupCharge = q.pickup;
  const subtotal = q.total;
  const discount = promo ? Math.min(promo.cents / 100, subtotal - 1) : 0;
  const total = Math.max(1, Math.round((subtotal - discount) * 100) / 100);
  const payNow = depositPct >= 100 ? total : Math.round((total * depositPct) / 100 * 100) / 100;
  const balanceDue = Math.round((total - payNow) * 100) / 100;
  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isPhone = (s: string) => s.replace(/[^\d]/g, "").length >= 8;
  const canContinue = !!date && !!time && guests >= minGuests && !slotInfo(time)?.full;


  const handleRequest = async () => {
    if (!date || !time) { toast.error("Pick a date and time first."); return; }
    if (!showContact) { setShowContact(true); return; }
    if (!name.trim() || !isEmail(email)) { toast.error("Enter your name and a valid email."); return; }
    if (!isPhone(phone)) { toast.error("Enter your WhatsApp number with country code."); return; }
    setRequesting(true);
    trackBookingStart(tour, total);
    try {
      const res = await requestFn({
        data: {
          tour_slug: tour.slug,
          tour_title: tour.title,
          customer_name: name,
          email,
          phone: phone.trim(),
          travel_date: format(date, "yyyy-MM-dd"),
          time,
          guests,
          pickup,
          notes: pickupChoice ? pickupSummary(pickupChoice) : null,
          amount: total * 100,
          tour_option_id: chosen?.id ?? null,
        },
      });
      setReference(res.reference);
      toast.success(`Reserved! Reference ${res.reference}. We hold your slot for 24 hours and send a payment link.`, { duration: 9000 });
    } catch (err) {
      toast.error((err as Error).message || "Could not save your request.");
    } finally {
      setRequesting(false);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) { toast.error("Pick a date and time first."); return; }
    if (!showContact) { setShowContact(true); return; }
    if (!name.trim() || !isEmail(email)) { toast.error("Enter your name and a valid email."); return; }
    if (!isPhone(phone)) { toast.error("Enter your WhatsApp number with country code."); return; }
    setPaying(true);
    trackBookingStart(tour, total);
    try {
      const res = await checkoutFn({
        data: {
          tour_slug: tour.slug,
          tour_title: tour.title,
          customer_name: name,
          email,
          phone: phone.trim(),
          travel_date: date ? format(date, "yyyy-MM-dd") : null,
          time,
          guests,
          ...pickupPayload,
          notes: pickupChoice ? pickupSummary(pickupChoice) : null,
          amount: Math.round(subtotal * 100),
          deposit_pct: depositPct,
          discount_code: promo?.code ?? null,
          tour_option_id: chosen?.id ?? null,
          image_url: tour.image?.startsWith("http") ? tour.image : null,

        },
      });
      if (res.mode === "pay" && res.url) {
        redirectToCheckout(res.url);
      } else {
        setPaying(false);
        toast.success(res.message || "Request received — we'll confirm by email shortly.", {
          duration: 8000,
        });
      }
    } catch (err) {
      setPaying(false);
      toast.error((err as Error).message || "Could not start checkout.");
    }
  };

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setCheckingPromo(true);
    try {
      const res = await checkPromoFn({
        data: { code, amount_cents: Math.round(subtotal * 100), guests },
      });
      if (res.valid) {
        setPromo({ code: res.code, cents: res.discount_cents });
        trackDiscountApplied(res.code, res.discount_cents / 100);
        toast.success(res.message);
      } else {
        setPromo(null);
        trackDiscountRejected(code);
        toast.error(res.message);
      }
    } catch {
      toast.error("Could not check that code.");
    } finally {
      setCheckingPromo(false);
    }
  };

  const contactValid = !!name.trim() && isEmail(email) && isPhone(phone);

  /** Creates the booking + PayPal order for the on-site wallet buttons. */
  const startWalletOrder = async (): Promise<string | null> => {
    if (!canContinue || !contactValid) {
      toast.error("Complete date, time and your contact details first.");
      return null;
    }
    const res = await checkoutFn({
      data: {
        tour_slug: tour.slug,
        tour_title: tour.title,
        customer_name: name,
        email,
        phone: phone.trim(),
        travel_date: date ? format(date, "yyyy-MM-dd") : null,
        time,
        guests,
        ...pickupPayload,
        notes: pickupChoice ? pickupSummary(pickupChoice) : null,
        amount: Math.round(subtotal * 100),
        deposit_pct: depositPct,
        discount_code: promo?.code ?? null,
        tour_option_id: chosen?.id ?? null,
        image_url: tour.image?.startsWith("http") ? tour.image : null,
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
        <p className="text-body text-xs tracking-tight">
          {perPersonPricing ? "per person · minimum 2 guests" : "per transfer · price per vehicle"}
        </p>
        {rating && rating.count > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <StarRating value={rating.average} size={14} />
            <span className="text-[11px] text-body">
              {rating.average.toFixed(1)} · {rating.count} {rating.count === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>

      <div className="px-6"><div className="h-px bg-border/60" /></div>

      {/* Trust details */}
      <div className="p-6 grid grid-cols-2 gap-y-4 gap-x-2">
        <Detail icon={<Clock className="w-4 h-4" strokeWidth={1.75} />} label={durationLabel} />
        <Detail icon={<Globe2 className="w-4 h-4" strokeWidth={1.75} />} label="EN / PT Guide" />
        <Detail
          icon={<ShieldCheck className="w-4 h-4" strokeWidth={1.75} />}
          label="Free cancel · 24h"
          title={CANCELLATION_POLICY_FULL}
        />
        <Detail
          icon={<MapPin className="w-4 h-4" strokeWidth={1.75} />}
          label={pickupFee > 0 ? `Hotel Pickup · +€${pickupFee}` : "Hotel Pickup"}
          title={pickupFee > 0 ? `Optional hotel pickup & drop-off available for €${pickupFee}.` : undefined}
        />
      </div>





      <div className="px-6 pb-2">
        <div className="flex gap-2.5 p-3 bg-gold/5 border border-gold/20 rounded-[2px]">
          <ShieldCheck className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" strokeWidth={1.75} />
          <p className="text-[11px] leading-relaxed text-body">
            <span className="text-ink font-medium">Free cancellation</span> up to 24 hours before the tour. Cancellations within 24 hours are non-refundable. If you reschedule and later cancel, refund is calculated from the <span className="text-ink font-medium">original booked date</span>.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 space-y-5">
        {/* Duration options */}
        {options.length > 0 && (
          <div>
            <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">
              Choose your tour duration
            </label>
            <DurationOptions
              options={options}
              selectedId={chosen?.id ?? null}
              onSelect={(id) => onSelectOption?.(id)}
              compact
            />
          </div>
        )}

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
                  <CalendarIcon className="w-4 h-4 text-gold" strokeWidth={1.75} />
                  {date ? format(date, "EEEE, MMM d, yyyy") : "Pick a date"}
                </span>
                <ChevronDown className="w-4 h-4 text-body" strokeWidth={1.75} />
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
            {TIME_SLOTS.map((t) => {
              const info = slotInfo(t);
              const full = !!info?.full;
              return (
                <button
                  key={t}
                  type="button"
                  disabled={full}
                  onClick={() => setTime(t)}
                  title={full ? "Fully booked" : info ? `${info.left} tuk-tuk(s) left` : undefined}
                  className={cn(
                    "py-2.5 min-h-[44px] text-xs rounded-[2px] border transition-colors",
                    full
                      ? "border-border text-body/40 line-through cursor-not-allowed"
                      : time === t
                        ? "border-gold bg-gold/5 text-ink font-medium"
                        : "border-border text-ink hover:border-gold",
                  )}
                >
                  {t}
                  {info && !full && info.left <= 1 && (
                    <span className="block text-[9px] text-gold">1 left</span>
                  )}
                </button>
              );
            })}
          </div>
           <label className="mt-3 block text-[11px] text-body">
             Or choose any time
             <input
               type="time"
               step={60}
               value={time}
               onChange={(event) => setTime(event.target.value)}
               className="mt-1.5 min-h-11 w-full rounded-[2px] border border-border bg-paper px-4 py-2.5 text-sm text-ink focus:border-gold focus:outline-none"
             />
           </label>
        </div>

        {dateKey && availability?.dayFull && (
          <p className="text-[11px] text-gold">
             The suggested times are full — choose another time or message us on WhatsApp.
          </p>
        )}

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
                onClick={() => setGuests(Math.max(minGuests, guests - 1))}
                aria-label="Decrease guests"
                className="w-6 h-6 flex items-center justify-center text-body hover:text-ink transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-ink w-4 text-center">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests(Math.min(MAX_GUESTS, guests + 1))}
                aria-label="Increase guests"
                className="w-6 h-6 flex items-center justify-center text-body hover:text-ink transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {perPersonPricing && (
            <p className="text-[11px] text-body mt-1.5">
              €{pricing.current} per person × {guests} = €{guestsTotal.toFixed(2)} · minimum 2 guests
              {q.tierPct > 0 && ` · group saving −${q.tierPct}%`}
            </p>
          )}
        </div>

        {/* Pickup — meetup point (included) or hotel pickup (chargeable) */}
        <PickupSelector
          tourSlug={tour.slug}
          pickupFeeCents={hotelPickupFeeCents}
          value={pickupChoice}
          onChange={setPickupChoice}
        />


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
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="WhatsApp number (with country code)"
              className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
            />
            <p className="text-[11px] text-body">We use WhatsApp for pickup details and day-of updates.</p>

          </div>
        )}
      </div>

      {/* Total + CTA */}
      <div className="bg-cloud/40 border-t border-border p-6 space-y-4">
        {(guestsTotal > 0 || pickupCharge > 0) && (
          <div className="space-y-1 text-[11px] text-body">
            <div className="flex justify-between">
              <span>
                {perPersonPricing ? `€${pricing.current} per person × ${guests}` : "Private transfer"}
              </span>
              <span>€{guestsTotal.toFixed(2)}</span>
            </div>
            {q.groupDiscount > 0 && (
              <div className="flex justify-between text-gold">
                <span>Group discount ({guests} guests, −{q.tierPct}%)</span>
                <span>−€{q.groupDiscount.toFixed(2)}</span>
              </div>
            )}
            {pickupCharge > 0 && (
              <div className="flex justify-between">
                <span>Hotel pickup &amp; drop-off</span>
                <span>+€{pickupCharge.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">Promo code</label>
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="flex-1 px-4 py-2.5 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
            />
            <button
              type="button"
              onClick={applyPromo}
              disabled={checkingPromo || !promoInput.trim()}
              className="px-4 py-2.5 border border-ink/20 text-ink text-[11px] uppercase tracking-[0.15em] rounded-[2px] hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
            >
              {checkingPromo ? "…" : "Apply"}
            </button>
          </div>
          {promo && (
            <button
              type="button"
              onClick={() => { setPromo(null); setPromoInput(""); }}
              className="mt-1.5 text-[11px] text-gold underline"
            >
              Remove code {promo.code}
            </button>
          )}
        </div>

        {discount > 0 && (
          <div className="flex justify-between text-[11px] text-gold">
            <span>Promo {promo?.code}</span>
            <span>−€{discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline">
          <span className="text-xs text-body">Total Amount</span>
          <span className="font-display text-2xl text-ink leading-none">€{total.toFixed(2)}</span>
        </div>

        {/* Pay in full or deposit */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">Payment option</label>
          <div className="grid grid-cols-4 gap-2">
            {[100, 50, 30, 20].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDepositPct(p)}
                className={cn(
                  "py-2.5 min-h-[44px] text-[11px] rounded-[2px] border transition-colors",
                  depositPct === p
                    ? "border-gold bg-gold/5 text-ink font-medium"
                    : "border-border text-ink hover:border-gold",
                )}
              >
                {p === 100 ? "Full" : `${p}%`}
              </button>
            ))}
          </div>
          {balanceDue > 0 ? (
            <div className="mt-2 flex justify-between text-[11px] text-body">
              <span>Pay now <span className="text-ink font-medium">€{payNow.toFixed(2)}</span></span>
              <span>Balance on the day €{balanceDue.toFixed(2)}</span>
            </div>
          ) : (
            <p className="mt-2 text-[11px] text-body">Paying the full amount now. Minimum deposit is 20%.</p>
          )}
        </div>


        {reference ? (
          <div className="border border-gold/40 bg-gold/5 rounded-[2px] p-4 text-center">
            <p className="text-xs text-body">Slot held for 24 hours</p>
            <p className="font-display text-2xl text-ink mt-1">Ref {reference}</p>
            <p className="text-[11px] text-body mt-2">
              We'll email you a payment link shortly. {CANCELLATION_POLICY_FULL}
            </p>
          </div>
        ) : (
          <>
            {!showContact && (
              <button
                onClick={() => { trackBookingCtaClick("tour_booking_panel", tour); setShowContact(true); }}
                disabled={paying || requesting || !canContinue}
                className="w-full bg-ink text-paper py-4 rounded-[2px] font-medium tracking-[0.2em] text-xs uppercase hover:bg-gold transition-colors shadow-[0_8px_20px_rgba(30,58,95,0.18)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                Continue to Booking
              </button>
            )}


            {showContact && (
              <PaypalWallet
                amount={payNow}
                label={tour.title}
                disabled={paying || requesting || !canContinue || !contactValid}
                createOrder={startWalletOrder}
                onPaid={finishWalletOrder}
              />
            )}



            <button
              onClick={() => { trackBookingCtaClick("tour_booking_panel_reserve", tour); handleRequest(); }}
              disabled={paying || requesting || !canContinue}
              className="w-full border border-ink/20 text-ink py-3.5 rounded-[2px] font-medium tracking-[0.15em] text-[11px] uppercase hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {requesting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Reserving…</>
              ) : (
                <>Reserve now, pay later</>
              )}
            </button>

            <WhatsappInline
              location="tour_booking_panel"
              message={`Hi! I'd like to ask about the ${tour.title} tuk-tuk tour.`}
            />

            <div className="rounded-[2px] border border-gold/30 bg-gold/[0.04] p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink font-bold mb-3">
                Why book direct with us
              </p>
              <ul className="space-y-2.5">
                {[
                  {
                    Icon: RotateCcw,
                    title: "Zero-risk booking",
                    body: "Cancel up to 24h before for a full refund.",
                  },
                  {
                    Icon: Wallet,
                    title: "Flexible payment",
                    body: "Pay from 20% today, the rest on the day of the tour.",
                  },
                  {
                    Icon: Umbrella,
                    title: "Weather guarantee",
                    body: "Free reschedule or refund if the weather turns bad.",
                  },
                  {
                    Icon: Lock,
                    title: "Secure checkout",
                    body: "Encrypted payment through PayPal — cards accepted.",
                  },
                ].map(({ Icon, title, body }) => (
                  <li key={title} className="flex items-start gap-2.5">
                    <Icon className="mt-[2px] h-4 w-4 text-gold shrink-0" strokeWidth={1.75} />
                    <span className="text-[11.5px] leading-snug text-body">
                      <span className="font-semibold text-ink">{title}</span> — {body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-center text-body italic">
              {showContact
                ? "Secure payment · free cancellation up to 24h before the tour"
                : "No payment required yet — reserve and pay within 24h"}
            </p>
          </>
        )}
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
