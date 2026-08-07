import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSiteBrand } from "@/lib/brand";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Calendar, Users, Trash2, Edit3, Copy, Check, Loader2, Clock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminCreateModificationCheckout,
  adminListModifications,
  adminApplyModification,
  adminWaiveModification,
  getMolliePaymentUrl,
} from "@/lib/booking-changes.functions";

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
  tour_slug: string | null;
  tour_title: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  travel_date: string | null;
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
  const [filter, setFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "custom" | "standard">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editGuests, setEditGuests] = useState<number | "">("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editNote, setEditNote] = useState("");
  const [generating, setGenerating] = useState(false);

  const createCheckout = useServerFn(adminCreateModificationCheckout);
  const listMods = useServerFn(adminListModifications);
  const applyMod = useServerFn(adminApplyModification);
  const waiveMod = useServerFn(adminWaiveModification);
  const getPaymentUrl = useServerFn(getMolliePaymentUrl);

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

  const bySource =
    sourceFilter === "custom"
      ? bookings.filter((b) => b.tour_slug === "custom")
      : sourceFilter === "standard"
        ? bookings.filter((b) => b.tour_slug !== "custom")
        : bookings;
  const q = search.trim().toLowerCase();
  const filtered = bySource
    .filter((b) => filter === "all" || b.status === filter)
    .filter((b) => {
      if (!q) return true;
      return (
        b.customer_name?.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
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
    });
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: bySource.filter((b) => b.status === s).length }),
    { all: bySource.length } as Record<string, number>,
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

  const mailto = (b: Booking) => {
    const subject = `Your booking${b.tour_title ? ` — ${b.tour_title}` : ""}`;
    const body = `Hi ${b.customer_name},\n\nThanks for your booking request${
      b.tour_title ? ` for "${b.tour_title}"` : ""
    }${b.travel_date ? ` on ${b.travel_date}` : ""}.\n\nWe'd love to confirm the details with you.\n\nBest,\nThe team`;
    return `mailto:${b.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  const generatePaymentLink = async (b: Booking, changeType: "add_guests" | "extend_duration" | "admin_adjustment") => {
    setGenerating(true);
    try {
      const newGuests = typeof editGuests === "number" ? editGuests : undefined;
      const newAmountCents = typeof editAmount === "number" ? Math.round(editAmount * 100) : undefined;
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
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Inbox</p>
        <h1 className="text-3xl font-display font-bold">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reply on WhatsApp, confirm, and keep your pipeline tidy.
        </p>
      </div>

      <BookingsCalendar bookings={bookings} />

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

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              filter === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)}{" "}
            <span className="opacity-70">({counts[s] ?? 0})</span>
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
              onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
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
          <p className="text-sm text-muted-foreground">No bookings here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((b) => (
            <article
              key={b.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-[0_10px_30px_rgba(30,58,95,0.06)] transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl">{b.customer_name}</h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(b.status)}`}
                    >
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.tour_title || "Custom inquiry"} ·{" "}
                    {new Date(b.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <button
                    type="button"
                    title="Click to copy full booking ID"
                    onClick={() => {
                      navigator.clipboard?.writeText(b.id);
                      toast.success("Booking ID copied");
                    }}
                    className="mt-1 font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ref #{b.id.slice(0, 8).toUpperCase()}
                  </button>
                </div>
                {b.total_estimate != null && (
                  <p className="font-display text-2xl text-primary tabular-nums">
                    €{b.total_estimate}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-sm text-foreground mb-4">
                <a
                  href={`mailto:${b.email}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {b.email}
                </a>
                {b.phone && (
                  <a
                    href={`tel:${b.phone}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
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
                </p>
              </div>

              {b.tour_slug === "custom" && Array.isArray(b.custom_selections) && b.custom_selections.length > 0 && (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 mb-4">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">
                    Custom tour selections
                    {b.payment_status && (
                      <span className="ml-2 normal-case tracking-normal text-muted-foreground font-normal">
                        · {b.payment_status === "request" ? "Quote request" : `Payment: ${b.payment_status}`}
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
                <a
                  href={mailto(b)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90"
                >
                  <Mail className="w-4 h-4" />
                  Email customer
                </a>
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

              {expandedId === b.id && (
                <div className="mt-5 pt-5 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Edit booking
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">New guest count</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={editGuests}
                        onChange={(e) => setEditGuests(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">New total amount (€)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
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
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      Generate guest-change link
                    </button>
                    <button
                      onClick={() => generatePaymentLink(b, "extend_duration")}
                      disabled={generating || typeof editAmount !== "number"}
                      className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 text-white px-3 py-2 text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
                    >
                      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
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
                              <p className="font-medium capitalize">{m.change_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">
                                Diff: €{(m.difference_cents / 100).toFixed(2)} · Status: {m.status} · Payment: {m.payment_status}
                              </p>
                              {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {m.status !== "applied" && m.payment_status === "pending" && m.difference_cents > 0 && m.stripe_session_id && (
                                <>
                              <button
                                    onClick={async () => {
                                      const { url } = await getPaymentUrl({ data: { sessionId: m.stripe_session_id } });
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
                                      const { url } = await getPaymentUrl({ data: { sessionId: m.stripe_session_id } });
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


function BookingsCalendar({ bookings }: { bookings: Booking[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const byDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (!b.travel_date) continue;
      (map[b.travel_date] ??= []).push(b);
    }
    return map;
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayKey = new Date().toISOString().slice(0, 10);
  const key = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const monthTotal = Object.entries(byDate).filter(([d]) =>
    d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`),
  ).reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold">Tour calendar</h2>
          <p className="text-xs text-muted-foreground">
            {first.toLocaleDateString(undefined, { month: "long", year: "numeric" })} · {monthTotal} booking{monthTotal === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="h-8 w-8 rounded-full border border-border text-sm hover:border-foreground"
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="h-8 w-8 rounded-full border border-border text-sm hover:border-foreground"
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="min-h-[62px]" />;
          const k = key(day);
          const list = byDate[k] ?? [];
          const isToday = k === todayKey;
          return (
            <div
              key={k}
              className={`min-h-[62px] rounded-lg border p-1 text-left ${
                isToday ? "border-primary" : "border-border"
              } ${list.length ? "bg-muted/50" : ""}`}
            >
              <div className="text-[11px] font-semibold text-muted-foreground">{day}</div>
              <div className="space-y-0.5 mt-0.5">
                {list.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    title={`${b.customer_name} · ${b.tour_title ?? "Tour"} · ${b.guests} guest(s)`}
                    className="truncate rounded bg-foreground/90 text-background px-1 py-0.5 text-[10px]"
                  >
                    {b.customer_name}
                  </div>
                ))}
                {list.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+{list.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
