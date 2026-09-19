import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSiteBrand } from "@/lib/brand";
import { toast } from "sonner";
import {
  MessageCircle,
  Mail,
  Phone,
  Calendar,
  Users,
  Trash2,
  Edit3,
  Copy,
  Check,
  Loader2,
  Clock,
  Star,
  Link2,
} from "lucide-react";
import { adminRequestPayment, adminSendBookingEmail } from "@/lib/bookings-admin.functions";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateModificationCheckout,
  adminListModifications,
  adminApplyModification,
  adminWaiveModification,
  getMolliePaymentUrl,
} from "@/lib/booking-changes.functions";
import { BookingCreateDialog } from "@/components/admin/BookingCreateDialog";
import { BookingManagePanel } from "@/components/admin/BookingManagePanel";
import { BookingsCalendar } from "@/components/admin/BookingsCalendar";
import {
  buildLedger,
  euro,
  tourStageClass,
  paymentStateClass,
  TOUR_STAGE_LABEL,
  PAYMENT_STATE_LABEL,
  type BookingLedger,
} from "@/lib/booking-ledger";

export const Route = createFileRoute("/admin/bookings")({
  component: BookingsInbox,
});

type CustomSelection = {
  id: string;
  category: "vehicle" | "duration" | "destination" | "addon" | string;
  name: string;
  price_cents: number;
};

type Booking = {
  id: string;
  booking_reference?: string | null;
  tour_status?: string | null;
  travel_time?: string | null;
  amount_total?: number | null;
  refund_cents?: number | null;
  tour_slug: string | null;
  tour_title: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  travel_date: string | null;
  option_duration_label?: string | null;
  guests: number;
  notes: string | null;
  total_estimate: number | null;
  status: string;
  payment_status: string | null;
  custom_selections: CustomSelection[] | null;
  created_at: string;
};

const CAT_LABEL: Record<string, string> = {
  vehicle: "Vehicle",
  duration: "Duration",
  destination: "Destinations",
  addon: "Add-ons",
};
const CAT_ORDER = ["vehicle", "duration", "destination", "addon"];

const STATUSES = ["new", "quoted", "confirmed", "done", "archived"] as const;

const SECTIONS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "payment_due", label: "Payment due" },
  { id: "completed_due", label: "Done · payment due" },
  { id: "history", label: "History" },
  { id: "cancelled", label: "Cancelled" },
  { id: "all", label: "All bookings" },
] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    new: "bg-primary/10 text-primary border-primary/20",
    quoted: "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400",
    confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    done: "bg-muted text-muted-foreground border-border",
    archived: "bg-muted/50 text-muted-foreground border-border",
  };
  return map[s] || map.new;
}

function BookingsInbox() {
  const qc = useQueryClient();
  useSiteBrand();
  const [section, setSection] = useState<string>("today");
  const [autoSectionDone, setAutoSectionDone] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "custom" | "standard">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editGuests, setEditGuests] = useState<number | "">("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editNote, setEditNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [pickedTemplate, setPickedTemplate] = useState<Record<string, string>>({});
  const [paymentPercent, setPaymentPercent] = useState<Record<string, number>>({});

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["admin-email-templates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("key,label")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createCheckout = useServerFn(adminCreateModificationCheckout);
  const listMods = useServerFn(adminListModifications);
  const applyMod = useServerFn(adminApplyModification);
  const waiveMod = useServerFn(adminWaiveModification);
  const getPaymentUrl = useServerFn(getMolliePaymentUrl);
  const sendBookingEmail = useServerFn(adminSendBookingEmail);
  const requestPayment = useServerFn(adminRequestPayment);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
  });

  const { data: paidOrders = [] } = useQuery({
    queryKey: ["admin-bookings-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("booking_id,amount_total,payment_status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: manualPayments = [] } = useQuery({
    queryKey: ["admin-bookings-manual-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_payments")
        .select("booking_id,amount_cents,direction,order_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ledgers = useMemo(() => {
    const ordersBy: Record<string, any[]> = {};
    for (const o of paidOrders as any[]) {
      if (o.booking_id) (ordersBy[o.booking_id] ??= []).push(o);
    }
    const manualBy: Record<string, any[]> = {};
    for (const m of manualPayments as any[]) {
      if (m.booking_id) (manualBy[m.booking_id] ??= []).push(m);
    }
    const out: Record<string, BookingLedger> = {};
    for (const b of bookings) {
      out[b.id] = buildLedger(b as any, ordersBy[b.id] ?? [], manualBy[b.id] ?? []);
    }
    return out;
  }, [bookings, paidOrders, manualPayments]);

  const bySource =
    sourceFilter === "custom"
      ? bookings.filter((b) => b.tour_slug === "custom")
      : sourceFilter === "standard"
        ? bookings.filter((b) => b.tour_slug !== "custom")
        : bookings;
  const q = search.trim().toLowerCase();

  const inSection = (b: Booking, id: string) => {
    const l = ledgers[b.id];
    if (!l) return id === "all";
    if (id === "all") return true;
    if (id === "payment_due")
      return l.dueCents > 0 && l.tourStage !== "cancelled" && l.section !== "history";
    return l.section === id;
  };

  const filtered = bySource
    .filter((b) => inSection(b, section))
    .filter((b) => {
      if (!q) return true;
      return (
        b.customer_name?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.booking_reference ?? "").toLowerCase().includes(q) ||
        b.email?.toLowerCase().includes(q) ||
        (b.phone ?? "").toLowerCase().includes(q) ||
        (b.tour_title ?? "").toLowerCase().includes(q)
      );
    })
    .filter((b) => {
      if (!dateFrom && !dateTo) return true;
      if (!b.travel_date) return false;
      if (dateFrom && b.travel_date < dateFrom) return false;
      if (dateTo && b.travel_date > dateTo) return false;
      return true;
    })
    .sort((a, b) => {
      const ad = a.travel_date ?? "";
      const bd = b.travel_date ?? "";
      const past = section === "history" || section === "cancelled" || section === "completed_due";
      if (ad !== bd) return past ? bd.localeCompare(ad) : ad.localeCompare(bd);
      return (a.travel_time ?? "").localeCompare(b.travel_time ?? "");
    });

  const counts = SECTIONS.reduce(
    (acc, s) => ({ ...acc, [s.id]: bySource.filter((b) => inSection(b, s.id)).length }),
    {} as Record<string, number>,
  );
  const customCount = bookings.filter((b) => b.tour_slug === "custom").length;

  const exportCsv = () => {
    const headers = [
      "Created",
      "Status",
      "Payment",
      "Source",
      "Customer",
      "Email",
      "Phone",
      "Tour",
      "Travel date",
      "Guests",
      "Total (EUR)",
      "Notes",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((b) => [
      new Date(b.created_at).toISOString(),
      b.status,
      b.payment_status ?? "",
      b.tour_slug === "custom" ? "custom" : "standard",
      b.customer_name,
      b.email,
      b.phone ?? "",
      b.tour_title ?? "",
      b.travel_date ?? "",
      b.guests,
      b.total_estimate ?? "",
      (b.notes ?? "").replace(/\n/g, " "),
    ]);
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-count", "bookings"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this booking? This can't be undone.")) return;
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-count", "bookings"] });
  };

  const waLink = (b: Booking) => {
    // Only build a WhatsApp link when the CUSTOMER provided a phone number.
    // Falling back to business.whatsappPhone would open a chat with ourselves.
    if (!b.phone) return null;
    const num = b.phone.replace(/[^\d]/g, "");
    if (!num) return null;
    const msg = `Hi ${b.customer_name}, thanks for your booking request${
      b.tour_title ? ` for "${b.tour_title}"` : ""
    }${b.travel_date ? ` on ${b.travel_date}` : ""}. We'd love to confirm the details with you.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const customerMessage = (b: Booking) =>
    `Hi ${b.customer_name}, thanks for your booking${b.tour_title ? ` for "${b.tour_title}"` : ""}${
      b.travel_date ? ` on ${new Date(b.travel_date).toLocaleDateString("en-GB")}` : ""
    } for ${b.guests} guest${b.guests === 1 ? "" : "s"}. Your reference is #${b.id
      .slice(0, 8)
      .toUpperCase()}. See you soon — Tuk Tuk 24`;

  const sendDirect = async (b: Booking, templateKey: string, label: string) => {
    setSendingKey(`${b.id}:${templateKey}`);
    try {
      const res: any = await sendBookingEmail({
        data: { bookingId: b.id, templateKey, overrides: {} },
      });
      if (res?.queued) toast.success(`${label} queued for ${b.email}`);
      else toast.error("Recipient is unsubscribed or blocked");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (err) {
      toast.error((err as Error).message || "Could not send the email");
    } finally {
      setSendingKey(null);
    }
  };

  const sendPaymentRequest = async (b: Booking) => {
    const percent = paymentPercent[b.id] ?? 20;
    setSendingKey(`${b.id}:payment_request`);
    try {
      const res = await requestPayment({ data: { id: b.id, percent } });
      toast.success(
        `${percent === 100 ? "Full payment" : `${percent}% payment`} request for €${(
          res.requestCents / 100
        ).toFixed(2)} emailed to ${b.email}`,
      );
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch (err) {
      toast.error((err as Error).message || "Could not send the payment request");
    } finally {
      setSendingKey(null);
    }
  };

  const reviewRequestWa = (b: Booking) => {
    if (!b.phone) return null;
    const num = b.phone.replace(/[^\d]/g, "");
    if (!num) return null;
    const msg = `Hi ${b.customer_name}, thanks for riding with Tuk Tuk 24${
      b.tour_title ? ` (${b.tour_title})` : ""
    }! If you enjoyed it, would you mind leaving us a quick review? https://tuktuk24lisbon.com/reviews`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  };

  const { data: modifications = [] } = useQuery({
    queryKey: ["admin-booking-modifications", expandedId],
    queryFn: async () => {
      if (!expandedId) return [];
      return listMods({ data: { bookingId: expandedId } });
    },
    enabled: !!expandedId,
  });

  const toggleExpanded = (id: string, guests: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setEditGuests(guests);
    setEditAmount("");
    setEditNote("");
  };

  const generatePaymentLink = async (
    b: Booking,
    changeType: "add_guests" | "extend_duration" | "admin_adjustment",
  ) => {
    setGenerating(true);
    try {
      const newGuests = typeof editGuests === "number" ? editGuests : undefined;
      const newAmountCents =
        typeof editAmount === "number" ? Math.round(editAmount * 100) : undefined;
      const res = await createCheckout({
        data: {
          bookingId: b.id,
          changeType,
          newGuests,
          newAmountCents,
          note: editNote.trim() || null,
        },
      });

      if (res.mode === "pay" && "url" in res && res.url) {
        await navigator.clipboard.writeText(res.url);
        toast.success("Payment link copied to clipboard");
      } else if (res.mode === "waived") {
        toast.success("Change recorded with no extra charge");
        qc.invalidateQueries({ queryKey: ["admin-bookings"] });
        qc.invalidateQueries({ queryKey: ["admin-booking-modifications", expandedId] });
      } else {
        toast.success("Change request recorded");
      }
    } catch (err) {
      toast.error((err as Error).message || "Could not create checkout");
    } finally {
      setGenerating(false);
    }
  };

  const applyWithoutPayment = async (modId: string) => {
    try {
      await applyMod({ data: { modificationId: modId } });
      toast.success("Change applied");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-booking-modifications", expandedId] });
    } catch (err) {
      toast.error((err as Error).message || "Could not apply change");
    }
  };

  const waiveAndApply = async (modId: string) => {
    try {
      await waiveMod({ data: { modificationId: modId } });
      await applyMod({ data: { modificationId: modId } });
      toast.success("Change waived and applied");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-booking-modifications", expandedId] });
    } catch (err) {
      toast.error((err as Error).message || "Could not waive change");
    }
  };

  const paymentLinkMailto = (b: Booking, url: string) => {
    const subject = `Payment link for your booking change — Tuk Tuk 24`;
    const body = `Hi ${b.customer_name},\n\nWe've updated your booking. Please use the link below to pay the difference:\n\n${url}\n\nLet us know if you have any questions.\n\nBest,\nTuk Tuk 24`;
    return `mailto:${b.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <AdminShell requires="bookings.view">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
            Inbox
          </p>
          <h1 className="text-3xl font-display font-bold">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add bookings from any source, edit them, and email your guests.
          </p>
        </div>
        <BookingCreateDialog />
      </div>

      <BookingsCalendar
        bookings={bookings as any}
        ledgers={ledgers}
        onOpen={(id) => {
          setSection("all");
          setSearch("");
          setDateFrom("");
          setDateTo("");
          setSourceFilter("all");
          setExpandedId(id);
          setTimeout(() => {
            document
              .getElementById(`booking-${id}`)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 60);
        }}
      />

      <div className="flex flex-wrap gap-2 mb-3">
        {(
          [
            { id: "all", label: "All sources", count: bookings.length },
            { id: "custom", label: "Custom tour requests", count: customCount },
            { id: "standard", label: "Standard tours", count: bookings.length - customCount },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSourceFilter(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              sourceFilter === opt.id
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:border-foreground"
            }`}
          >
            {opt.label} <span className="opacity-70">({opt.count})</span>
          </button>
        ))}
      </div>

      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              section === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {s.label} <span className="opacity-70">({counts[s.id] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone or tour…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="hidden sm:inline">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="hidden sm:inline">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-2 text-sm"
            />
          </label>
          {(search || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
              className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            Export CSV ({filtered.length})
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {section === "today"
              ? "No tours today."
              : section === "history"
                ? "Nothing here yet — completed and fully paid bookings land here."
                : "No bookings in this section."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <article
              key={b.id}
              id={`booking-${b.id}`}
              className="scroll-mt-24 rounded-xl border border-border bg-card p-4 sm:p-5 hover:shadow-[0_10px_30px_rgba(30,58,95,0.06)] transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl">{b.customer_name}</h3>
                    {ledgers[b.id] && (
                      <>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tourStageClass(ledgers[b.id].tourStage)}`}
                        >
                          {TOUR_STAGE_LABEL[ledgers[b.id].tourStage]}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${paymentStateClass(ledgers[b.id].paymentState)}`}
                        >
                          {PAYMENT_STATE_LABEL[ledgers[b.id].paymentState]}
                        </span>
                      </>
                    )}
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(b.status)}`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.tour_title || "Custom inquiry"}
                    {b.travel_date
                      ? ` · ${new Date(b.travel_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                      : ""}
                    {b.travel_time ? ` · ${String(b.travel_time).slice(0, 5)}` : ""}
                  </p>
                  <button
                    type="button"
                    title="Click to copy the booking reference"
                    onClick={() => {
                      navigator.clipboard?.writeText(b.booking_reference || b.id);
                      toast.success("Booking reference copied");
                    }}
                    className="mt-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {b.booking_reference || `Ref #${b.id.slice(0, 8).toUpperCase()}`}
                  </button>
                </div>
                {ledgers[b.id] && ledgers[b.id].totalCents > 0 && (
                  <div className="text-right">
                    <p className="font-display text-2xl text-primary tabular-nums">
                      {euro(ledgers[b.id].totalCents)}
                    </p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">
                      {euro(ledgers[b.id].paidCents)} paid
                      {ledgers[b.id].dueCents > 0 && (
                        <span className="font-semibold text-rose-600">
                          {" "}
                          · {euro(ledgers[b.id].dueCents)} due
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-sm text-foreground mb-4">
                <button
                  type="button"
                  title="Click to copy the email address"
                  onClick={() => {
                    navigator.clipboard?.writeText(b.email);
                    toast.success("Email copied");
                  }}
                  className="flex items-center gap-2 text-left hover:text-primary"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {b.email}
                </button>
                {b.phone && (
                  <a href={`tel:${b.phone}`} className="flex items-center gap-2 hover:text-primary">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {b.phone}
                  </a>
                )}
                {b.travel_date && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {new Date(b.travel_date).toLocaleDateString(undefined, {
                      dateStyle: "full",
                    })}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  {b.guests} guest{b.guests === 1 ? "" : "s"}
                  {b.option_duration_label ? ` · ${b.option_duration_label}` : ""}
                </p>
              </div>

              {b.tour_slug === "custom" &&
                Array.isArray(b.custom_selections) &&
                b.custom_selections.length > 0 && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-3 mb-4">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">
                      Custom tour selections
                      {b.payment_status && (
                        <span className="ml-2 normal-case tracking-normal text-muted-foreground font-normal">
                          ·{" "}
                          {b.payment_status === "request"
                            ? "Quote request"
                            : `Payment: ${b.payment_status}`}
                        </span>
                      )}
                    </p>
                    <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {CAT_ORDER.flatMap((cat) => {
                        const items = b.custom_selections!.filter((s) => s.category === cat);
                        if (items.length === 0) return [];
                        return [
                          <div key={cat} className="col-span-full mt-1 first:mt-0">
                            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                              {CAT_LABEL[cat] ?? cat}
                            </p>
                          </div>,
                          ...items.map((s) => (
                            <div key={s.id} className="flex justify-between gap-3 pl-1">
                              <span className="text-foreground">{s.name}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {s.price_cents === 0 ? "—" : `€${(s.price_cents / 100).toFixed(0)}`}
                              </span>
                            </div>
                          )),
                        ];
                      })}
                    </div>
                  </div>
                )}

              {b.notes && (
                <div className="rounded-md bg-muted/40 border border-border p-3 text-sm text-foreground mb-4 whitespace-pre-wrap">
                  {b.notes}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {b.total_estimate != null &&
                  b.total_estimate > 0 &&
                  b.payment_status !== "paid" &&
                  b.status !== "cancelled" && (
                    <div className="basis-full rounded-md border border-border bg-muted/40 p-3 mb-1">
                      <p className="text-xs font-semibold mb-2">Send payment request</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {[20, 50, 70, 100].map((percent) => {
                          const selected = (paymentPercent[b.id] ?? 20) === percent;
                          return (
                            <button
                              key={percent}
                              type="button"
                              aria-pressed={selected}
                              onClick={() =>
                                setPaymentPercent((current) => ({ ...current, [b.id]: percent }))
                              }
                              className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary"
                              }`}
                            >
                              {percent === 100 ? "Full amount" : `${percent}%`}
                            </button>
                          );
                        })}
                        <span className="text-xs text-muted-foreground">
                          €{(
                            (b.total_estimate * (paymentPercent[b.id] ?? 20)) /
                            100
                          ).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => sendPaymentRequest(b)}
                          disabled={sendingKey === `${b.id}:payment_request`}
                          className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-50"
                        >
                          {sendingKey === `${b.id}:payment_request` ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          Email request
                        </button>
                      </div>
                    </div>
                  )}
                {waLink(b) && (
                  <a
                    href={waLink(b)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#25D366] text-white px-3 py-2 text-sm font-semibold hover:opacity-90"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp customer
                  </a>
                )}
                <button
                  onClick={() => sendDirect(b, "booking_confirmation", "Confirmation")}
                  disabled={sendingKey === `${b.id}:booking_confirmation`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {sendingKey === `${b.id}:booking_confirmation` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send confirmation
                </button>
                <button
                  onClick={() => sendDirect(b, "tour_reminder", "Reminder")}
                  disabled={sendingKey === `${b.id}:tour_reminder`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {sendingKey === `${b.id}:tour_reminder` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  Send reminder
                </button>
                <button
                  onClick={() => sendDirect(b, "review_request", "Review request")}
                  disabled={sendingKey === `${b.id}:review_request`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {sendingKey === `${b.id}:review_request` ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Star className="w-4 h-4" />
                  )}
                  Ask for review
                </button>
                {emailTemplates.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background pl-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <select
                      value={pickedTemplate[b.id] ?? ""}
                      onChange={(e) =>
                        setPickedTemplate((prev) => ({ ...prev, [b.id]: e.target.value }))
                      }
                      className="bg-transparent py-2 text-sm outline-none"
                    >
                      <option value="">Other email…</option>
                      {emailTemplates.map((t: any) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const key = pickedTemplate[b.id];
                        if (!key) return toast.error("Pick an email first");
                        const label =
                          emailTemplates.find((t: any) => t.key === key)?.label || "Email";
                        sendDirect(b, key, label);
                      }}
                      disabled={sendingKey === `${b.id}:${pickedTemplate[b.id]}`}
                      className="rounded-r-md border-l border-border px-3 py-2 text-sm font-semibold hover:text-primary disabled:opacity-50"
                    >
                      {sendingKey === `${b.id}:${pickedTemplate[b.id]}` ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Send"
                      )}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(customerMessage(b));
                    toast.success("Message copied");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
                >
                  <Copy className="w-4 h-4" />
                  Copy message
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${window.location.origin}/booking/manage`);
                    toast.success("Booking link copied");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
                >
                  <Link2 className="w-4 h-4" />
                  Copy link
                </button>
                {reviewRequestWa(b) && (
                  <a
                    href={reviewRequestWa(b)!}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary"
                  >
                    <Star className="w-4 h-4" />
                    Review via WhatsApp
                  </a>
                )}
                <select
                  value={b.status}
                  onChange={(e) => updateStatus(b.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      Mark as {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => toggleExpanded(b.id, b.guests)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit / changes
                </button>
                <button
                  onClick={() => remove(b.id)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              {expandedId === b.id && <BookingManagePanel booking={b} />}

              {expandedId === b.id && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Edit booking
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        New guest count
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={editGuests}
                        onChange={(e) =>
                          setEditGuests(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        New total amount (€)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editAmount}
                        onChange={(e) =>
                          setEditAmount(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Leave blank to auto-calculate"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-muted-foreground mb-1">Note</label>
                      <input
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Reason for change"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => generatePaymentLink(b, "add_guests")}
                      disabled={generating}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Generate guest-change link
                    </button>
                    <button
                      onClick={() => generatePaymentLink(b, "extend_duration")}
                      disabled={generating || typeof editAmount !== "number"}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 text-white px-3 py-2 text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      {generating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      Generate extension link
                    </button>
                    <button
                      onClick={() => generatePaymentLink(b, "admin_adjustment")}
                      disabled={generating || typeof editAmount !== "number"}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
                    >
                      Custom adjustment
                    </button>
                  </div>

                  {modifications.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Change history
                      </p>
                      <div className="space-y-2">
                        {modifications.map((m: any) => (
                          <div
                            key={m.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm"
                          >
                            <div>
                              <p className="font-medium capitalize">
                                {m.change_type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Diff: €{(m.difference_cents / 100).toFixed(2)} · Status: {m.status}{" "}
                                · Payment: {m.payment_status}
                              </p>
                              {m.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {m.status !== "applied" &&
                                m.payment_status === "pending" &&
                                m.difference_cents > 0 &&
                                m.stripe_session_id && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        const { url } = await getPaymentUrl({
                                          data: { sessionId: m.stripe_session_id },
                                        });
                                        if (url) {
                                          await navigator.clipboard.writeText(url);
                                          toast.success("Link copied");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
                                    >
                                      <Copy className="w-3 h-3" /> Copy link
                                    </button>
                                    <button
                                      onClick={async () => {
                                        const { url } = await getPaymentUrl({
                                          data: { sessionId: m.stripe_session_id },
                                        });
                                        if (url) {
                                          window.location.href = paymentLinkMailto(b, url);
                                        } else {
                                          toast.error("Payment link not available");
                                        }
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs hover:bg-primary/90"
                                    >
                                      <Mail className="w-3 h-3" /> Email link
                                    </button>
                                  </>
                                )}
                              {m.status !== "applied" && m.payment_status === "paid" && (
                                <button
                                  onClick={() => applyWithoutPayment(m.id)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-1 text-xs hover:bg-emerald-700"
                                >
                                  <Check className="w-3 h-3" /> Apply
                                </button>
                              )}
                              {m.status !== "applied" && m.difference_cents <= 0 && (
                                <button
                                  onClick={() => waiveAndApply(m.id)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2 py-1 text-xs hover:bg-emerald-700"
                                >
                                  <Check className="w-3 h-3" /> Apply free
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
