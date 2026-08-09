import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { confirmCheckout } from "@/lib/checkout.functions";

export const Route = createFileRoute("/booking/success")({
  // PayPal returns ?token=<order id>; Stripe/Mollie return ?session_id=
  validateSearch: z.object({
    session_id: z.string().optional(),
    token: z.string().optional(),
    PayerID: z.string().optional(),
  }),
  component: SuccessPage,
  head: () => ({
    meta: [
      { title: "Booking confirmed · Tuk Tuk 24" },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center p-8 text-center">
      <p className="text-sm text-muted-foreground">Could not confirm your payment. Please contact us.</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Not found</div>,
});

function SuccessPage() {
  const { session_id } = Route.useSearch();
  const [state, setState] = useState<{
    loading: boolean;
    paid: boolean;
    tour?: string | null;
    amount?: number;
    name?: string | null;
    bookingId?: string | null;
    travelDate?: string | null;
    guests?: number | null;
  }>({ loading: true, paid: false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session_id) {
      setState({ loading: false, paid: false });
      return;
    }
    confirmCheckout({ data: { session_id } })
      .then((r) =>
        setState({
          loading: false,
          paid: r.paid,
          tour: r.tour_title,
          amount: r.amount_total,
          name: r.customer_name,
          bookingId: r.booking_id,
          travelDate: r.travel_date,
          guests: r.guests,
        }),
      )
      .catch(() => setState({ loading: false, paid: false }));
  }, [session_id]);

  return (
    <div className="min-h-screen bg-cloud/40 grid place-items-center p-6">
      <div className="max-w-md w-full bg-white border border-border rounded-2xl p-10 text-center shadow-sm">
        {state.loading ? (
          <>
            <Loader2 className="w-10 h-10 mx-auto text-gold animate-spin mb-4" />
            <p className="text-body">Confirming your payment…</p>
          </>
        ) : state.paid ? (
          <>
            <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold grid place-items-center mx-auto mb-6">
              <Check className="w-7 h-7 text-gold" />
            </div>
            <h1 className="font-display text-3xl text-ink mb-2">Payment received</h1>
            <p className="text-body text-sm mb-6">
              {state.name ? `Thanks ${state.name.split(" ")[0]}! ` : "Thank you! "}
              We've confirmed your booking{state.tour ? ` for ${state.tour}` : ""}.
              You'll receive details on WhatsApp shortly.
            </p>
            {state.amount ? (
              <p className="font-display text-3xl text-gold mb-6">
                €{(state.amount / 100).toFixed(2)}
              </p>
            ) : null}
            {state.bookingId ? (
              <div className="mb-6 p-4 border border-border rounded-lg text-left">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-body mb-1.5">
                  Your booking reference
                </p>
                <p className="font-mono text-sm text-ink break-all">{state.bookingId}</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(state.bookingId!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-gold hover:underline"
                >
                  {copied ? "Copied" : "Copy reference"}
                </button>
                <p className="text-xs text-body mt-2 leading-relaxed">
                  Keep this — you'll need it with your email to manage or extend your booking.
                </p>
              </div>
            ) : null}
            <div className="mb-8 p-4 bg-gold/5 border border-gold/20 rounded-lg text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-1.5">Cancellation policy</p>
              <p className="text-xs text-body leading-relaxed">
                <span className="text-ink font-medium">Free cancellation</span> up to 24 hours before the tour. Cancellations made less than 24 hours before the tour are non-refundable. If you reschedule and later cancel, refund eligibility is calculated from the <span className="text-ink font-medium">original booked date and time</span>, not the rescheduled one.
              </p>
            </div>
            <div className="mb-8 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-body mb-3">What happens next</p>
              <ol className="space-y-3">
                {[
                  "You'll get a WhatsApp/email confirmation from our team within a few hours.",
                  "24 hours before the tour we send your driver's name, phone number and exact pickup point.",
                  "On the day, meet your driver at the agreed spot — just bring comfortable shoes.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="w-6 h-6 shrink-0 rounded-full bg-gold/15 border border-gold/40 text-gold grid place-items-center text-[11px] font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-xs text-body leading-relaxed">{t}</span>
                  </li>
                ))}
              </ol>
            </div>

            {state.travelDate ? (
              <div className="mb-8 flex flex-wrap gap-3 justify-center">
                <a
                  href={googleCalUrl(state)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 rounded-full border border-ink/20 text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
                >
                  Add to Google Calendar
                </a>
                <button
                  type="button"
                  onClick={() => downloadIcs(state)}
                  className="px-5 py-2.5 rounded-full border border-ink/20 text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
                >
                  Apple / Outlook (.ics)
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                to="/"
                className="inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest hover:bg-gold transition"
              >
                Back to home
              </Link>
              <Link
                to="/booking/manage"
                className="inline-block px-7 py-3 rounded-full border border-ink/20 text-ink text-[11px] font-semibold uppercase tracking-widest hover:border-gold hover:text-gold transition"
              >
                Manage or extend booking
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl text-ink mb-2">Payment not confirmed</h1>
            <p className="text-body text-sm mb-6">
              We couldn't confirm your payment yet. If you were charged, please contact us — we'll sort it out.
            </p>
            <Link
              to="/"
              className="inline-block px-7 py-3 rounded-full bg-ink text-white text-[11px] font-semibold uppercase tracking-widest"
            >
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

type SuccessState = {
  tour?: string | null;
  bookingId?: string | null;
  travelDate?: string | null;
  guests?: number | null;
};

function calRange(dateStr: string) {
  const start = new Date(`${dateStr}T09:00:00`);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  return { start: fmt(start), end: fmt(end) };
}

function calTitle(s: SuccessState) {
  return `${s.tour || "Tuk Tuk 24 tour"} · Lisbon`;
}

function calDetails(s: SuccessState) {
  return [
    s.bookingId ? `Booking reference: ${s.bookingId}` : null,
    s.guests ? `Guests: ${s.guests}` : null,
    "Your driver's details arrive 24h before the tour.",
  ]
    .filter(Boolean)
    .join("\n");
}

function googleCalUrl(s: SuccessState) {
  const { start, end } = calRange(s.travelDate as string);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: calTitle(s),
    dates: `${start}/${end}`,
    details: calDetails(s),
    location: "Lisbon, Portugal",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadIcs(s: SuccessState) {
  const { start, end } = calRange(s.travelDate as string);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tuk Tuk 24//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${s.bookingId || Date.now()}@tuktuk24lisbon.com`,
    `DTSTAMP:${start}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${calTitle(s)}`,
    `DESCRIPTION:${calDetails(s).replace(/\n/g, "\\n")}`,
    "LOCATION:Lisbon, Portugal",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "tuktuk24-booking.ics";
  a.click();
  URL.revokeObjectURL(url);
}
