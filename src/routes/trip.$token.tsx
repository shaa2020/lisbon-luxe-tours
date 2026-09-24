import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Users,
  Languages,
  ShieldCheck,
  Backpack,
} from "lucide-react";
import { getGuestTour } from "@/lib/guest-tour.functions";
import { DEFAULT_BUSINESS } from "@/lib/brand";

export const Route = createFileRoute("/trip/$token")({
  head: () => ({
    meta: [
      { title: "Your tour · Tuk Tuk 24 Lisbon" },
      { name: "description", content: "Your private Tuk Tuk 24 tour details, guide and meeting point." },
      { property: "og:title", content: "Your tour · Tuk Tuk 24 Lisbon" },
      { property: "og:description", content: "Your private tour details, guide and meeting point." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TripPage,
  errorComponent: () => <Shell><p className="text-body text-sm">We couldn't load your tour. Please message us on WhatsApp.</p></Shell>,
  notFoundComponent: () => <Shell><p className="text-body text-sm">Tour not found.</p></Shell>,
});

const STEPS = ["Booked", "Guide assigned", "Tour day", "On the way", "Enjoy", "Review"];
const lisbonToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Lisbon" });
const euro = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;
const digits = (p: string) => p.replace(/[^\d]/g, "");

function currentStep(t: any) {
  if (t.stage === "completed") return 5;
  if (t.stage === "in_progress") return 4;
  const today = lisbonToday();
  if (t.travel_date && t.travel_date === today) return t.guide ? 3 : 2;
  if (t.guide) return 1;
  return 0;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cloud/40 px-4 py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-gold">Tuk Tuk 24 · Lisbon</p>
        {children}
      </div>
    </div>
  );
}

function Card({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-background border border-border rounded-2xl p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-body mb-3">
        <Icon className="w-4 h-4 text-gold" strokeWidth={1.75} /> {title}
      </h2>
      {children}
    </section>
  );
}

function TripPage() {
  const { token } = Route.useParams();
  const { data: t, isLoading } = useQuery({
    queryKey: ["guest-tour", token],
    queryFn: () => getGuestTour({ data: { token } }),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Shell><p className="text-center text-body text-sm">Loading your tour…</p></Shell>;
  if (!t)
    return (
      <Shell>
        <Card icon={ShieldCheck} title="Link not valid">
          <p className="text-sm text-body">This link is no longer active. Please message us and we'll send you a new one.</p>
        </Card>
      </Shell>
    );

  const office = digits(DEFAULT_BUSINESS.whatsappPhone);
  const cancelled = t.status === "cancelled" || t.stage === "cancelled";
  const step = currentStep(t);
  const hotel = t.pickup_type === "hotel";
  const placeName = hotel ? t.pickup_place_name || t.pickup_address : t.meetup_point_name;
  const placeAddr = hotel ? t.pickup_address : t.meetup_point_address;
  const instructions = hotel ? t.pickup_instructions : t.meetup_point_instructions;
  const mapUrl =
    t.pickup_latitude && t.pickup_longitude
      ? `https://maps.google.com/?q=${t.pickup_latitude},${t.pickup_longitude}`
      : placeAddr || placeName
        ? `https://maps.google.com/?q=${encodeURIComponent(`${placeName ?? ""} ${placeAddr ?? ""} Lisbon`)}`
        : null;
  const dateLabel = t.travel_date
    ? new Date(`${t.travel_date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Date to be confirmed";

  return (
    <Shell>
      <div className="text-center">
        <h1 className="font-display text-3xl text-ink">
          {t.customer_name ? `Hi ${String(t.customer_name).split(" ")[0]}` : "Your tour"}
        </h1>
        <p className="text-sm text-body mt-1">Everything for your tour, in one place.</p>
      </div>

      {cancelled ? (
        <Card icon={ShieldCheck} title="Booking cancelled">
          <p className="text-sm text-body">This booking was cancelled. If this is unexpected, please message us.</p>
        </Card>
      ) : (
        <section className="bg-background border border-border rounded-2xl p-5 shadow-sm">
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold border ${
                      done ? "bg-gold border-gold text-white" : active ? "border-gold text-gold bg-gold/10" : "border-border text-body/60"
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={`text-sm ${active ? "text-ink font-semibold" : done ? "text-ink" : "text-body/70"}`}>{s}</span>
                  {active && <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-gold">Now</span>}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <section className="bg-background border border-border rounded-2xl overflow-hidden shadow-sm">
        {t.tour_image && <img src={t.tour_image} alt={t.tour_title ?? "Tour"} className="w-full h-44 object-cover" />}
        <div className="p-5">
          <h2 className="font-display text-xl text-ink mb-3">{t.tour_title ?? "Private tuk tuk tour"}</h2>
          <ul className="space-y-2 text-sm text-body">
            <li className="flex gap-2"><CalendarDays className="w-4 h-4 text-gold" strokeWidth={1.75} />{dateLabel}</li>
            {t.travel_time && <li className="flex gap-2"><Clock className="w-4 h-4 text-gold" strokeWidth={1.75} />Starts {String(t.travel_time).slice(0, 5)}{t.tour_duration ? ` · ${t.tour_duration}` : ""}</li>}
            <li className="flex gap-2"><Users className="w-4 h-4 text-gold" strokeWidth={1.75} />{t.guests} guest{t.guests === 1 ? "" : "s"}</li>
          </ul>
          {t.booking_reference && <p className="mt-3 text-xs text-body">Reference <span className="font-mono text-ink">{t.booking_reference}</span></p>}
        </div>
      </section>

      <Card icon={Users} title="Your guide">
        {t.guide ? (
          <div>
            <div className="flex items-center gap-3">
              {t.guide.photo_url ? (
                <img src={t.guide.photo_url} alt={t.guide.name} className="w-14 h-14 rounded-full object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gold/15 text-gold grid place-items-center font-display text-xl">{t.guide.name.charAt(0)}</div>
              )}
              <div>
                <p className="font-semibold text-ink">{t.guide.name}</p>
                {t.guide.languages?.length > 0 && (
                  <p className="text-xs text-body flex items-center gap-1"><Languages className="w-3.5 h-3.5" />{t.guide.languages.join(", ")}</p>
                )}
              </div>
            </div>
            {t.guide.bio && <p className="text-sm text-body mt-3">{t.guide.bio}</p>}
            {t.guide.phone && !cancelled && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <a href={`tel:${t.guide.phone}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 py-2.5 text-xs font-semibold uppercase tracking-widest text-ink">
                  <Phone className="w-4 h-4" /> Call
                </a>
                <a href={`https://wa.me/${digits(t.guide.phone)}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-gold py-2.5 text-xs font-semibold uppercase tracking-widest text-white">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-body">Your guide will be confirmed up to 24 hours before the tour. This page updates by itself.</p>
        )}
      </Card>

      <Card icon={MapPin} title={hotel ? "Hotel pickup" : "Where to meet"}>
        {placeName || placeAddr ? (
          <>
            {placeName && <p className="font-semibold text-ink">{placeName}</p>}
            {placeAddr && placeAddr !== placeName && <p className="text-sm text-body">{placeAddr}</p>}
            {instructions && <p className="text-sm text-body mt-2">{instructions}</p>}
            {mapUrl && (
              <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-ink">
                <MapPin className="w-4 h-4" /> Open in Google Maps
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-body">We'll confirm the exact meeting point before your tour.</p>
        )}
      </Card>

      {t.total_cents > 0 && !cancelled && (
        <Card icon={CreditCard} title="Payment">
          <div className="flex justify-between text-sm"><span className="text-body">Total</span><span className="text-ink">{euro(t.total_cents)}</span></div>
          <div className="flex justify-between text-sm mt-1"><span className="text-body">Paid</span><span className="text-ink">{euro(t.paid_cents)}</span></div>
          <div className="flex justify-between text-sm mt-1 font-semibold"><span className="text-ink">Balance due</span><span className={t.due_cents > 0 ? "text-gold" : "text-ink"}>{t.due_cents > 0 ? euro(t.due_cents) : "Nothing to pay"}</span></div>
          {t.due_cents > 0 && (
            <Link to="/booking/pay/$id" params={{ id: t.id }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-xs font-semibold uppercase tracking-widest text-white">
              <CreditCard className="w-4 h-4" /> Pay balance
            </Link>
          )}
        </Card>
      )}

      {step >= 5 ? (
        <Card icon={Star} title="Thank you">
          <p className="text-sm text-body">We hope you loved Lisbon! If you have a minute, we'd be grateful for an honest review.</p>
          <Link to="/reviews" className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white">
            <Star className="w-4 h-4" /> Leave a review
          </Link>
        </Card>
      ) : (
        !cancelled && (
          <Card icon={Backpack} title="Before you go">
            <ul className="text-sm text-body space-y-1.5 list-disc pl-5">
              <li>Comfortable shoes and a light jacket</li>
              <li>Water and sun protection in summer</li>
              <li>Please be at the meeting point 5 minutes early</li>
            </ul>
            <p className="text-xs text-body mt-3">Free cancellation up to 24 hours before the tour.</p>
          </Card>
        )
      )}

      <a href={`https://wa.me/${office}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background py-4 text-sm font-semibold text-ink">
        <MessageCircle className="w-4 h-4 text-gold" /> Need help? Message us
      </a>
    </Shell>
  );
}
