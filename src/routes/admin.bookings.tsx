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
  created_at: string;
};

const STATUSES = ["new", "confirmed", "done", "archived"] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    new: "bg-primary/10 text-primary border-primary/20",
    confirmed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400",
    done: "bg-muted text-muted-foreground border-border",
    archived: "bg-muted/50 text-muted-foreground border-border",
  };
  return map[s] || map.new;
}

function BookingsInbox() {
  const qc = useQueryClient();
  const { business } = useSiteBrand();
  const [filter, setFilter] = useState<string>("all");

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

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: bookings.filter((b) => b.status === s).length }),
    { all: bookings.length } as Record<string, number>,
  );

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
