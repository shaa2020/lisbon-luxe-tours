import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Mail, Send, History, Ban, Undo2, Save } from "lucide-react";
import {
  adminUpdateBooking,
  adminCancelBooking,
  adminRecordRefund,
  adminSendBookingEmail,
  adminPreviewBookingEmail,
  adminBookingTimeline,
  adminRequestPayment,
} from "@/lib/bookings-admin.functions";
import { supabase } from "@/integrations/supabase/client";

type Booking = {
  id: string;
  customer_name: string;
  email: string;
  phone: string | null;
  tour_title: string | null;
  travel_date: string | null;
  guests: number;
  total_estimate: number | null;
  status: string;
  payment_status: string | null;
  notes: string | null;
};

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const lbl = "block text-xs text-muted-foreground mb-1";

export function BookingManagePanel({ booking }: { booking: Booking }) {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateBooking);
  const cancel = useServerFn(adminCancelBooking);
  const refund = useServerFn(adminRecordRefund);
  const sendEmail = useServerFn(adminSendBookingEmail);
  const previewEmail = useServerFn(adminPreviewBookingEmail);
  const timeline = useServerFn(adminBookingTimeline);

  const [tab, setTab] = useState<"details" | "email" | "history">("details");
  const [busy, setBusy] = useState(false);

  const [d, setD] = useState({
    customer_name: booking.customer_name,
    email: booking.email,
    phone: booking.phone ?? "",
    tour_title: booking.tour_title ?? "",
    travel_date: booking.travel_date ?? "",
    guests: booking.guests,
    total: booking.total_estimate ?? "",
    status: booking.status,
    payment_status: booking.payment_status ?? "unpaid",
    notes: booking.notes ?? "",
    notify: false,
  });

  const [templateKey, setTemplateKey] = useState("booking_confirmation");
  const requestPayment = useServerFn(adminRequestPayment);
  const [reqPct, setReqPct] = useState(20);
  const totalCents = booking.total_estimate != null ? Math.round(Number(booking.total_estimate) * 100) : 0;
  const reqCents = totalCents ? Math.max(1, Math.round((totalCents * reqPct) / 100)) : 0;
  const payUrl = `https://tuktuk24lisbon.com/booking/pay/${booking.id}`;
  const waText = encodeURIComponent(
    `Hello ${booking.customer_name.split(" ")[0]}! To secure your Tuk Tuk 24 booking, please pay €${(reqCents / 100).toFixed(2)} here: ${payUrl}`,
  );
  const waHref = booking.phone
    ? `https://wa.me/${String(booking.phone).replace(/\D/g, "")}?text=${waText}`
    : `https://wa.me/?text=${waText}`;

  const doRequestPayment = async () => {
    setBusy(true);
    try {
      await requestPayment({ data: { id: booking.id, percent: reqPct } });
      toast.success(`Payment request for €${(reqCents / 100).toFixed(2)} emailed to ${booking.email}`);
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const [ov, setOv] = useState({
    subject: "",
    heading: "",
    intro: "",
    outro: "",
    ctaLabel: "",
    ctaUrl: "",
  });
  const [preview, setPreview] = useState<any>(null);

  const { data: templates = [] } = useQuery({
    queryKey: ["admin-email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("key,label,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: events = [], refetch: refetchEvents } = useQuery({
    queryKey: ["admin-booking-timeline", booking.id],
    queryFn: () => timeline({ data: { bookingId: booking.id } }),
    enabled: tab === "history",
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    refetchEvents();
  };

  const overrides = () => ({
    subject: ov.subject.trim() || null,
    heading: ov.heading.trim() || null,
    intro: ov.intro.trim() || null,
    outro: ov.outro.trim() || null,
    ctaLabel: ov.ctaLabel.trim() || null,
    ctaUrl: ov.ctaUrl.trim() || null,
  });

  const doPreview = async () => {
    setBusy(true);
    try {
      setPreview(
        await previewEmail({
          data: { bookingId: booking.id, templateKey, overrides: overrides() },
        }),
      );
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doSend = async () => {
    setBusy(true);
    try {
      const res: any = await sendEmail({
        data: { bookingId: booking.id, templateKey, overrides: overrides() },
      });
      toast[res?.sent ? "success" : "error"](
        res?.queued ? `Email queued to ${booking.email}` : "Recipient is unsubscribed or blocked",
      );
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    setBusy(true);
    try {
      const totalEur = d.total === "" ? null : Math.round(Number(d.total));
      await update({
        data: {
          id: booking.id,
          notify: d.notify,
          patch: {
            customer_name: d.customer_name.trim(),
            email: d.email.trim(),
            phone: d.phone.trim() || null,
            tour_title: d.tour_title.trim() || null,
            travel_date: d.travel_date || null,
            guests: Number(d.guests) || 1,
            total_estimate: totalEur,
            amount_total: totalEur == null ? null : totalEur * 100,
            status: d.status,
            payment_status: d.payment_status,
            notes: d.notes.trim() || null,
          },
        },
      });
      toast.success(d.notify ? "Saved and customer email queued" : "Booking saved");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doCancel = async () => {
    const reason = prompt("Reason for cancellation (optional)") ?? "";
    const refundStr = prompt("Refund amount in € (0 for none)", "0") ?? "0";
    if (!confirm("Cancel this booking and email the customer?")) return;
    setBusy(true);
    try {
      await cancel({
        data: {
          id: booking.id,
          reason: reason || null,
          refundCents: Math.round(Number(refundStr) * 100) || 0,
          notify: true,
        },
      });
      toast.success("Booking cancelled");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doRefund = async () => {
    const amount = prompt("Refund amount in €") ?? "";
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents <= 0) return;
    setBusy(true);
    try {
      await refund({ data: { id: booking.id, refundCents: cents, notify: true, note: null } });
      toast.success("Refund recorded and customer email queued");
      refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 pt-5 border-t border-border">
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["details", "Booking details", Save],
            ["email", "Email customer", Mail],
            ["history", "History", History],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
              tab === id
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {totalCents > 0 && booking.payment_status !== "paid" && booking.status !== "cancelled" && (
        <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3.5">
          <p className="text-xs font-semibold">Ask the customer to pay online now</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Emails a branded payment link (also handy for WhatsApp).
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {[20, 30, 50, 100].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReqPct(p)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold border ${
                  reqPct === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                {p}%
              </button>
            ))}
            <span className="text-xs">
              <strong>€{(reqCents / 100).toFixed(2)}</strong>
              <span className="text-muted-foreground"> now · €{((totalCents - reqCents) / 100).toFixed(2)} later</span>
            </span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={doRequestPayment}
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Email payment request
            </button>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"
            >
              <Send className="w-3.5 h-3.5" /> WhatsApp link
            </a>
          </div>
        </div>
      )}


      {tab === "details" && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Name</label>
              <input
                className={field}
                value={d.customer_name}
                onChange={(e) => setD({ ...d, customer_name: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input
                className={field}
                value={d.email}
                onChange={(e) => setD({ ...d, email: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>WhatsApp / phone</label>
              <input
                className={field}
                value={d.phone}
                onChange={(e) => setD({ ...d, phone: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Tour</label>
              <input
                className={field}
                value={d.tour_title}
                onChange={(e) => setD({ ...d, tour_title: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Date</label>
              <input
                className={field}
                type="date"
                value={d.travel_date}
                onChange={(e) => setD({ ...d, travel_date: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Guests</label>
              <input
                className={field}
                type="number"
                min={1}
                max={40}
                value={d.guests}
                onChange={(e) => setD({ ...d, guests: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={lbl}>Total (€)</label>
              <input
                className={field}
                type="number"
                min={0}
                value={d.total}
                onChange={(e) => setD({ ...d, total: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Payment status</label>
              <select
                className={field}
                value={d.payment_status}
                onChange={(e) => setD({ ...d, payment_status: e.target.value })}
              >
                {["unpaid", "deposit", "paid", "refunded", "request"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Customer notes</label>
              <textarea
                rows={2}
                className={field}
                value={d.notes}
                onChange={(e) => setD({ ...d, notes: e.target.value })}
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={d.notify}
              onChange={(e) => setD({ ...d, notify: e.target.checked })}
            />
            Email the customer about this update
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={saveDetails}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{" "}
              Save changes
            </button>
            <button
              onClick={doRefund}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary"
            >
              <Undo2 className="w-4 h-4" /> Record refund
            </button>
            <button
              onClick={doCancel}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm font-semibold hover:bg-destructive/10"
            >
              <Ban className="w-4 h-4" /> Cancel booking
            </button>
          </div>
        </>
      )}

      {tab === "email" && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Email type</label>
              <select
                className={field}
                value={templateKey}
                onChange={(e) => {
                  setTemplateKey(e.target.value);
                  setPreview(null);
                }}
              >
                {templates.map((t: any) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Subject override</label>
              <input
                className={field}
                value={ov.subject}
                onChange={(e) => setOv({ ...ov, subject: e.target.value })}
                placeholder="Leave blank to use the template"
              />
            </div>
            <div>
              <label className={lbl}>Heading override</label>
              <input
                className={field}
                value={ov.heading}
                onChange={(e) => setOv({ ...ov, heading: e.target.value })}
              />
            </div>
            <div>
              <label className={lbl}>Button label</label>
              <input
                className={field}
                value={ov.ctaLabel}
                onChange={(e) => setOv({ ...ov, ctaLabel: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Button link (e.g. a payment link)</label>
              <input
                className={field}
                value={ov.ctaUrl}
                onChange={(e) => setOv({ ...ov, ctaUrl: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Message</label>
              <textarea
                rows={4}
                className={field}
                value={ov.intro}
                onChange={(e) => setOv({ ...ov, intro: e.target.value })}
                placeholder="Leave blank to use the saved template text"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Closing note</label>
              <textarea
                rows={2}
                className={field}
                value={ov.outro}
                onChange={(e) => setOv({ ...ov, outro: e.target.value })}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Placeholders:{" "}
            {
              "{{customer_name}} {{booking_ref}} {{tour}} {{date}} {{guests}} {{total}} {{refund_amount}}"
            }
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={doPreview}
              disabled={busy}
              className="rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary"
            >
              Preview
            </button>
            <button
              onClick={doSend}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{" "}
              Send to {booking.email}
            </button>
          </div>
          {preview && (
            <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p className="text-xs text-muted-foreground">Subject</p>
              <p className="font-semibold mb-3">{preview.subject}</p>
              <p className="font-display text-lg mb-2">{preview.heading}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{preview.intro}</p>
              {preview.rows?.length > 0 && (
                <div className="mt-3 grid gap-1">
                  {preview.rows.map((r: any) => (
                    <div key={r.label} className="flex justify-between gap-4">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {r.label}
                      </span>
                      <span className="font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {preview.ctaLabel && preview.ctaUrl && (
                <p className="mt-3 text-xs text-primary">
                  Button: {preview.ctaLabel} → {preview.ctaUrl}
                </p>
              )}
              {preview.outro && (
                <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{preview.outro}</p>
              )}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          ) : (
            events.map((e: any) => (
              <div key={e.id} className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">{e.summary}</p>
                <p className="text-xs text-muted-foreground">
                  {e.kind} · {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
