import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { adminCreateBooking } from "@/lib/bookings-admin.functions";

const SOURCES = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "phone", label: "Phone" },
  { id: "walk_in", label: "Walk-in" },
  { id: "partner", label: "Partner / hotel" },
  { id: "email", label: "Email" },
  { id: "website", label: "Website" },
] as const;

export function BookingCreateDialog() {
  const qc = useQueryClient();
  const create = useServerFn(adminCreateBooking);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    customer_name: "",
    email: "",
    phone: "",
    tour_title: "",
    travel_date: "",
    travel_time: "",
    guests: 2,
    total: "",
    status: "confirmed",
    payment_status: "unpaid",
    source: "whatsapp",
    notes: "",
    internal_notes: "",
    sendConfirmation: true,
    requestPayment: false,
    depositPercent: 20,
  });

  const totalEurNum = f.total === "" ? 0 : Math.max(0, Number(f.total));
  const depositEur = Math.round(((totalEurNum * f.depositPercent) / 100) * 100) / 100;
  const remainingEur = Math.max(0, totalEurNum - depositEur);

  const set = (k: keyof typeof f, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.customer_name.trim() || !f.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (f.requestPayment && totalEurNum <= 0) {
      toast.error("Set a total before requesting a deposit");
      return;
    }
    setSaving(true);
    try {
      const totalEur = f.total === "" ? null : Math.round(Number(f.total));
      await create({
        data: {
          customer_name: f.customer_name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim() || null,
          tour_title: f.tour_title.trim() || null,
          tour_slug: null,
          travel_date: f.travel_date || null,
          travel_time: f.travel_time || null,
          guests: Number(f.guests) || 1,
          total_estimate: totalEur,
          amount_total: totalEur == null ? null : totalEur * 100,
          status: f.status,
          payment_status: f.payment_status,
          source: f.source as any,
          notes: f.notes.trim() || null,
          internal_notes: f.internal_notes.trim() || null,
          sendConfirmation: f.sendConfirmation,
          depositPercent: f.requestPayment ? f.depositPercent : null,
          sendPaymentRequest: f.requestPayment,
        },
      });
      toast.success(
        f.requestPayment
          ? `Booking added — payment request for €${depositEur.toFixed(2)} emailed`
          : f.sendConfirmation
            ? "Booking added and confirmation emailed"
            : "Booking added",
      );
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setOpen(false);
      setF((s) => ({ ...s, customer_name: "", email: "", phone: "", tour_title: "", notes: "", internal_notes: "", total: "", requestPayment: false }));
    } catch (err) {
      toast.error((err as Error).message || "Could not create booking");
    } finally {
      setSaving(false);
    }
  };

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  const lbl = "block text-xs text-muted-foreground mb-1";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="w-4 h-4" /> New booking
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <div
            className="mx-auto my-8 max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="font-display text-2xl">Add a booking</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  For tours booked over WhatsApp, phone, a partner or in person.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={lbl}>Customer name *</label>
                <input className={field} value={f.customer_name} onChange={(e) => set("customer_name", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Email *</label>
                <input className={field} type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>WhatsApp / phone</label>
                <input className={field} value={f.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Tour</label>
                <input className={field} value={f.tour_title} onChange={(e) => set("tour_title", e.target.value)} placeholder="Alfama & Old Lisbon · 2h" />
              </div>
              <div>
                <label className={lbl}>Date</label>
                <input className={field} type="date" value={f.travel_date} onChange={(e) => set("travel_date", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Start time</label>
                <input className={field} type="time" value={f.travel_time} onChange={(e) => set("travel_time", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Guests</label>
                <input className={field} type="number" min={1} max={40} value={f.guests} onChange={(e) => set("guests", Number(e.target.value))} />
              </div>
              <div>
                <label className={lbl}>Total (€)</label>
                <input className={field} type="number" min={0} value={f.total} onChange={(e) => set("total", e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Source</label>
                <select className={field} value={f.source} onChange={(e) => set("source", e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Payment</label>
                <select className={field} value={f.payment_status} onChange={(e) => set("payment_status", e.target.value)}>
                  {["unpaid", "deposit", "paid", "refunded"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Customer notes</label>
                <textarea className={field} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Internal notes (never emailed)</label>
                <textarea className={field} rows={2} value={f.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={f.sendConfirmation} onChange={(e) => set("sendConfirmation", e.target.checked)} />
              Email the customer a booking confirmation
            </label>

            <div className="mt-3 rounded-lg border border-border bg-muted/40 p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={f.requestPayment}
                  onChange={(e) => set("requestPayment", e.target.checked)}
                />
                Ask the customer to pay online now (email payment link)
              </label>
              {f.requestPayment && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Charge now — 20% to 100% of the total</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {[20, 30, 50, 100].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set("depositPercent", p)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border ${
                          f.depositPercent === p
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                    <input
                      type="number"
                      min={20}
                      max={100}
                      value={f.depositPercent}
                      onChange={(e) =>
                        set("depositPercent", Math.min(100, Math.max(20, Number(e.target.value) || 20)))
                      }
                      className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  {totalEurNum > 0 ? (
                    <p className="mt-2 text-xs">
                      <span className="font-semibold text-foreground">€{depositEur.toFixed(2)}</span>{" "}
                      <span className="text-muted-foreground">due now · </span>
                      <span className="font-semibold text-foreground">€{remainingEur.toFixed(2)}</span>{" "}
                      <span className="text-muted-foreground">left to pay later</span>
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-600">Enter the total above to see the amounts.</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className="rounded-md border border-border px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
