import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { getBookingForManage, requestBookingChange } from "@/lib/booking-changes.functions";
import { CANCELLATION_POLICY_FULL } from "@/lib/cancellation";
import { Calendar, Users, Loader2, ArrowLeft, MessageCircle, Plus, Clock } from "lucide-react";

export const Route = createFileRoute("/booking/manage")({
  component: ManageBookingPage,
  head: () => ({
    meta: [
      { title: "Manage your booking · Tuk Tuk 24" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type BookingView = {
  id: string;
  tour_slug: string | null;
  tour_title: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  travel_date: string | null;
  guests: number;
  total_estimate: number | null;
  amount_total: number | null;
  status: string;
  payment_status: string | null;
  notes: string | null;
  custom_selections: { name: string; category: string; price_cents: number }[] | null;
  created_at: string;
};

function ManageBookingPage() {
  const [step, setStep] = useState<"lookup" | "view" | "request">("lookup");
  const [bookingId, setBookingId] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [loading, setLoading] = useState(false);
  const [changeType, setChangeType] = useState<"add_guests" | "extend_duration">("add_guests");
  const [newGuests, setNewGuests] = useState(2);
  const [note, setNote] = useState("");

  const fetchBooking = useServerFn(getBookingForManage);
  const requestChange = useServerFn(requestBookingChange);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchBooking({ data: { bookingId: bookingId.trim(), email: email.trim() } });
      setBooking(data as unknown as BookingView);
      setNewGuests((data as unknown as BookingView).guests + 1);
      setStep("view");
    } catch (err) {
      toast.error("Booking not found. Check the ID and email.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!booking) return;
    setLoading(true);
    try {
      const res = await requestChange({
        data: {
          bookingId: booking.id,
          email: booking.email,
          changeType,
          newGuests: changeType === "add_guests" ? newGuests : undefined,
          note: note.trim() || null,
        },
      });
      if (res.mode === "pay" && "url" in res && res.url) {
        window.location.href = res.url;
      } else {
        toast.success("Request sent. We'll be in touch within 24h.");
        setStep("view");
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not send request.");
    } finally {
      setLoading(false);
    }
  };

  const whatsappLink = (b: BookingView) => {
    const phone = b.phone || "+351922024690";
    const num = phone.replace(/[^\d]/g, "");
    const msg = `Hi, I'd like to make a change to my booking ${b.id.slice(0, 8)} for ${b.tour_title || "my tour"}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-white text-ink">
      <Nav />
      <main className="pt-[68px] md:pt-[120px]">
        <section className="py-10 md:py-16">
          <div className="container-x max-w-xl">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-body hover:text-ink mb-6">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>

            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Manage your booking</h1>
            <p className="text-body text-sm mb-8">Add guests, request more time, or ask us a question.</p>

            {step === "lookup" && (
              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">
                    Booking ID
                  </label>
                  <input
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    placeholder="e.g. a1b2c3d4-e5f6-..."
                    className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">
                    Email used for booking
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-ink text-paper py-4 rounded-[2px] font-medium tracking-[0.2em] text-xs uppercase hover:bg-gold transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find booking"}
                </button>
              </form>
            )}

            {step === "view" && booking && (
              <div className="space-y-6">
                <div className="bg-cloud/40 border border-border rounded-[4px] p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-body font-bold">Booking</p>
                      <p className="font-display text-xl">{booking.tour_title || "Custom tour"}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-gold/10 text-gold text-[10px] uppercase tracking-widest font-semibold rounded-full">
                      {booking.status}
                    </span>
                  </div>
                  <div className="grid gap-2 text-sm">
                    {booking.travel_date && (
                      <p className="flex items-center gap-2 text-body">
                        <Calendar className="w-4 h-4 text-gold" />
                        {new Date(booking.travel_date).toLocaleDateString(undefined, { dateStyle: "full" })}
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-body">
                      <Users className="w-4 h-4 text-gold" />
                      {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                    </p>
                    <p className="flex items-center gap-2 text-body">
                      <span className="font-display text-lg text-ink">€{booking.total_estimate ?? 0}</span>
                      <span className="text-xs">paid / estimated</span>
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={() => { setChangeType("add_guests"); setStep("request"); }}
                    className="flex items-center justify-between p-4 border border-border rounded-[2px] hover:border-gold transition-colors text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gold/10 grid place-items-center">
                        <Plus className="w-4 h-4 text-gold" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">Add guests</span>
                        <span className="block text-[11px] text-body">Extra travellers after booking</span>
                      </span>
                    </span>
                    <span className="text-xs text-gold font-medium">Change</span>
                  </button>

                  <button
                    onClick={() => { setChangeType("extend_duration"); setStep("request"); }}
                    className="flex items-center justify-between p-4 border border-border rounded-[2px] hover:border-gold transition-colors text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-gold/10 grid place-items-center">
                        <Clock className="w-4 h-4 text-gold" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">Extend duration</span>
                        <span className="block text-[11px] text-body">Make the tour longer</span>
                      </span>
                    </span>
                    <span className="text-xs text-gold font-medium">Request</span>
                  </button>

                  <a
                    href={whatsappLink(booking)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 border border-border rounded-[2px] hover:border-gold transition-colors text-left"
                  >
                    <span className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#25D366]/10 grid place-items-center">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-ink">Message us</span>
                        <span className="block text-[11px] text-body">Ask a question on WhatsApp</span>
                      </span>
                    </span>
                    <span className="text-xs text-gold font-medium">Open</span>
                  </a>
                </div>

                <div className="p-4 bg-gold/5 border border-gold/20 rounded-[2px]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gold mb-1.5">Cancellation policy</p>
                  <p className="text-xs text-body leading-relaxed">{CANCELLATION_POLICY_FULL}</p>
                </div>
              </div>
            )}

            {step === "request" && booking && (
              <div className="space-y-6">
                <button
                  onClick={() => setStep("view")}
                  className="inline-flex items-center gap-2 text-sm text-body hover:text-ink"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to booking
                </button>

                <div>
                  <h2 className="font-display text-2xl font-bold mb-1">
                    {changeType === "add_guests" ? "Add guests" : "Extend duration"}
                  </h2>
                  <p className="text-sm text-body">
                    Current booking: {booking.guests} guest{booking.guests === 1 ? "" : "s"} · €{booking.total_estimate ?? 0}
                  </p>
                </div>

                {changeType === "add_guests" && (
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">
                      New total number of guests
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setNewGuests(Math.max(booking.guests + 1, newGuests - 1))}
                        className="w-10 h-10 border border-border rounded-[2px] hover:border-gold"
                      >
                        −
                      </button>
                      <span className="font-display text-2xl w-8 text-center">{newGuests}</span>
                      <button
                        type="button"
                        onClick={() => setNewGuests(Math.min(20, newGuests + 1))}
                        className="w-10 h-10 border border-border rounded-[2px] hover:border-gold"
                      >
                        +
                      </button>
                    </div>
                    {newGuests <= booking.guests && (
                      <p className="text-xs text-red-600 mt-2">New guest count must be higher than current.</p>
                    )}
                  </div>
                )}

                {changeType === "extend_duration" && (
                  <div className="p-4 bg-cloud/40 border border-border rounded-[2px] text-sm text-body">
                    We'll review your request and send you a payment link for the extra time.
                  </div>
                )}

                <div>
                  <label className="text-[10px] uppercase tracking-widest text-body font-bold block mb-2">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Anything else we should know?"
                    rows={3}
                    className="w-full px-4 py-3 bg-paper border border-border rounded-[2px] text-sm text-ink placeholder:text-body focus:outline-none focus:border-gold transition-colors"
                  />
                </div>

                <button
                  onClick={handleRequest}
                  disabled={loading || (changeType === "add_guests" && newGuests <= booking.guests)}
                  className="w-full bg-ink text-paper py-4 rounded-[2px] font-medium tracking-[0.2em] text-xs uppercase hover:bg-gold transition-colors disabled:opacity-40 inline-flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : changeType === "add_guests" ? "Continue to payment" : "Send request"}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
