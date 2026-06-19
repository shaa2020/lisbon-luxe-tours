import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSiteBrand } from "@/lib/brand";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Calendar, Users, Trash2 } from "lucide-react";

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

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Inbox</p>
        <h1 className="text-3xl font-display font-bold">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Reply on WhatsApp, confirm, and keep your pipeline tidy.
        </p>
      </div>

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
                  onClick={() => remove(b.id)}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
