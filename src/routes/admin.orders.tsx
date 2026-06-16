import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";

import { toast } from "sonner";
import { Mail, MessageCircle, Calendar, Users, Trash2, CreditCard, FileText, Download } from "lucide-react";
import { useSiteBrand, DEFAULT_BUSINESS, DEFAULT_BRAND_NAME, DEFAULT_BRAND_LOGO, type BusinessInfo } from "@/lib/brand";
import { downloadInvoice, buildInvoiceMailto, buildInvoicePdf } from "@/lib/invoice";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  booking_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_total: number;
  currency: string;
  payment_status: string;
  customer_name: string | null;
  customer_email: string | null;
  tour_title: string | null;
  tour_slug: string | null;
  guests: number | null;
  travel_date: string | null;
  created_at: string;
};

const STATUSES = ["paid", "pending", "failed", "rescheduled"] as const;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    failed: "bg-red-500/10 text-red-700 border-red-500/30",
    rescheduled: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  };
  return map[s] || map.pending;
}

function OrdersPage() {
  const qc = useQueryClient();
  const { brandName, business, logoUrl } = useSiteBrand();
  const [filter, setFilter] = useState<string>("all");

  const handleInvoiceDownload = (o: Order) => {
    const number = downloadInvoice(o as any, { brandName, business, logoUrl });
    toast.success(`Invoice ${number} downloaded`);
  };

  const handleInvoiceEmail = (o: Order) => {
    if (!o.customer_email) return toast.error("No customer email on file");
    const { doc, number } = buildInvoicePdf(o as any, { brandName, business, logoUrl });
    doc.save(`${number}.pdf`);
    const url = buildInvoiceMailto(o as any, number, brandName);
    window.location.href = url;
    toast.success(`Invoice ${number} ready — attach the downloaded PDF to the email`);
  };


  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    refetchInterval: 15000, // poll for new paid orders
  });

  const filtered = filter === "all" ? orders : orders.filter((o) => o.payment_status === filter);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: orders.filter((o) => o.payment_status === s).length }),
    { all: orders.length } as Record<string, number>,
  );
  const revenue =
    orders
      .filter((o) => o.payment_status === "paid")
      .reduce((sum, o) => sum + (o.amount_total || 0), 0) / 100;

  const setStatus = async (id: string, payment_status: string) => {
    const { error } = await supabase.from("orders").update({ payment_status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this order? This cannot be undone.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-count", "orders"] });
  };

  const mailto = (o: Order) => {
    const subject = o.tour_title
      ? `Your booking — ${o.tour_title}`
      : "Your booking";
    const body = `Hi ${o.customer_name || "there"},\n\nThank you for your payment${
      o.tour_title ? ` for "${o.tour_title}"` : ""
    }${o.travel_date ? ` on ${o.travel_date}` : ""}.\n\nWe're confirming the details now.\n\nBest,\nThe team`;
    return `mailto:${o.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
          Revenue
        </p>
        <h1 className="text-3xl font-display font-bold">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Card payments via Stripe. Paid orders auto-confirm the matching booking.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Total revenue
          </p>
          <p className="font-display text-2xl text-primary mt-1">€{revenue.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Paid</p>
          <p className="font-display text-2xl mt-1">{counts.paid ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Pending</p>
          <p className="font-display text-2xl mt-1">{counts.pending ?? 0}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Failed</p>
          <p className="font-display text-2xl mt-1">{counts.failed ?? 0}</p>
        </div>
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
          <CreditCard className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No orders here yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((o) => (
            <article
              key={o.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-[0_10px_30px_rgba(30,58,95,0.06)] transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-xl">
                      {o.customer_name || "Guest"}
                    </h3>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(o.payment_status)}`}
                    >
                      {o.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {o.tour_title || "—"} ·{" "}
                    {new Date(o.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <p className="font-display text-2xl text-primary tabular-nums">
                  €{(o.amount_total / 100).toFixed(2)}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2 text-sm text-foreground mb-4">
                {o.customer_email && (
                  <a
                    href={`mailto:${o.customer_email}`}
                    className="flex items-center gap-2 hover:text-primary"
                  >
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {o.customer_email}
                  </a>
                )}
                {o.travel_date && (
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {new Date(o.travel_date).toLocaleDateString(undefined, { dateStyle: "full" })}
                  </p>
                )}
                {o.guests != null && (
                  <p className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {o.guests} guest{o.guests === 1 ? "" : "s"}
                  </p>
                )}
                {o.stripe_session_id && (
                  <p className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                    <CreditCard className="w-3.5 h-3.5" />
                    {o.stripe_session_id.slice(0, 22)}…
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleInvoiceEmail(o)}
                  disabled={!o.customer_email}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download invoice PDF and open email to customer"
                >
                  <FileText className="w-4 h-4" />
                  Send invoice
                </button>
                <button
                  onClick={() => handleInvoiceDownload(o)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
                  title="Download invoice PDF"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                {o.customer_email && (
                  <a
                    href={mailto(o)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Email
                  </a>
                )}
                <select
                  value={o.payment_status}
                  onChange={(e) => setStatus(o.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      Mark as {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(o.id)}
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
