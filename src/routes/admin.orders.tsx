import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Calendar,
  Users,
  Trash2,
  CreditCard,
  FileText,
  Download,
  Search,
  RefreshCcw,
  ExternalLink,
  Copy,
  AlertCircle,
  Undo2,
  Send,
} from "lucide-react";
import {
  useSiteBrand,
  DEFAULT_BUSINESS,
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_LOGO,
  type BusinessInfo,
} from "@/lib/brand";
import { downloadInvoice, buildInvoicePdf } from "@/lib/invoice";
import {
  adminListOrders,
  adminEmailOrderInvoice,
  adminRequestOrderBalance,
  adminRefundOrder,
  adminSetOrderStatus,
  adminDeleteOrder,
  type AdminOrder,
} from "@/lib/orders-admin.functions";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

const STATUSES = [
  "paid",
  "pending",
  "failed",
  "partially_refunded",
  "refunded",
  "rescheduled",
] as const;
const PROVIDERS = ["paypal", "mollie", "stripe", "manual"] as const;
const RANGES = [
  { key: "all", label: "All time", days: 0 },
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
] as const;

const PAGE_SIZE = 25;

function statusBadge(s: string) {
  const map: Record<string, string> = {
    paid: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
    pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
    failed: "bg-red-500/10 text-red-700 border-red-500/30",
    refunded: "bg-slate-500/10 text-slate-700 border-slate-500/30",
    partially_refunded: "bg-orange-500/10 text-orange-700 border-orange-500/30",
    rescheduled: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  };
  return map[s] || map.pending;
}

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

function providerLabel(p: string) {
  const map: Record<string, string> = {
    paypal: "PayPal",
    mollie: "Mollie",
    stripe: "Stripe",
    manual: "Manual",
  };
  return map[p] || p;
}

function OrdersPage() {
  const qc = useQueryClient();
  const { can } = useAuth();
  const { brandName, logoUrl } = useSiteBrand();

  const listOrders = useServerFn(adminListOrders);
  const emailInvoice = useServerFn(adminEmailOrderInvoice);
  const requestBalance = useServerFn(adminRequestOrderBalance);
  const refundOrder = useServerFn(adminRefundOrder);
  const setOrderStatus = useServerFn(adminSetOrderStatus);
  const deleteOrder = useServerFn(adminDeleteOrder);

  const [status, setStatus] = useState<string>("all");
  const [provider, setProvider] = useState<string>("all");
  const [range, setRange] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"date" | "amount">("date");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [requestPercent, setRequestPercent] = useState<Record<string, number>>({});

  const canRefund = can("orders.refund");

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listOrders({} as any),
    refetchInterval: 30000,
  });

  // Always use the freshest business details when generating an invoice PDF.
  const fetchFreshBrand = async () => {
    const { data } = await supabase.from("site_settings").select("*").eq("id", true as any).maybeSingle();
    const d: any = data || {};
    const business: BusinessInfo = {
      contactEmail: d.contact_email || DEFAULT_BUSINESS.contactEmail,
      contactPhone: d.contact_phone || DEFAULT_BUSINESS.contactPhone,
      whatsappPhone: d.whatsapp_phone || DEFAULT_BUSINESS.whatsappPhone,
      addressLine1: d.address_line1 || DEFAULT_BUSINESS.addressLine1,
      addressLine2: d.address_line2 || DEFAULT_BUSINESS.addressLine2,
      city: d.city || DEFAULT_BUSINESS.city,
      country: d.country || DEFAULT_BUSINESS.country,
      instagramUrl: d.instagram_url || DEFAULT_BUSINESS.instagramUrl,
      facebookUrl: d.facebook_url || DEFAULT_BUSINESS.facebookUrl,
      twitterUrl: d.twitter_url || DEFAULT_BUSINESS.twitterUrl,
      footerTagline: d.footer_tagline || DEFAULT_BUSINESS.footerTagline,
      footerLegal: d.footer_legal || DEFAULT_BUSINESS.footerLegal,
    };
    return {
      brandName: d.brand_name || brandName || DEFAULT_BRAND_NAME,
      logoUrl: d.logo_url ?? logoUrl ?? DEFAULT_BRAND_LOGO,
      business,
    };
  };

  const invoicePayload = (o: AdminOrder) => ({
    ...o,
    amount_total: o.booking?.totalCents || o.amount_total,
    paid_cents: o.booking ? o.booking.paidCents : o.amount_total,
    refund_cents: o.booking?.refund_cents ?? 0,
    customer_phone: o.booking?.phone ?? null,
    travel_time: o.booking?.travel_time ?? null,
    payment_method: providerLabel(o.provider),
    reference: o.booking_id || o.id,
  });

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: any) {
      toast.error(e?.message || "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = async (o: AdminOrder) => {
    const brand = await fetchFreshBrand();
    const number = downloadInvoice(invoicePayload(o) as any, brand);
    toast.success(`Invoice ${number} downloaded`);
  };

  const handleEmailInvoice = (o: AdminOrder) =>
    run(`inv-${o.id}`, () => emailInvoice({ data: { orderId: o.id } }), "Invoice emailed to the customer");

  const handleRequestBalance = (o: AdminOrder) => {
    const percent = requestPercent[o.id] ?? 100;
    return run(
      `bal-${o.id}`,
      () => requestBalance({ data: { orderId: o.id, percent: Math.round(percent) } }),
      "Payment request emailed",
    );
  };

  const handleRefund = (o: AdminOrder) => {
    const input = prompt(
      `Refund amount in euros (max ${(o.amount_total / 100).toFixed(2)})`,
      (o.amount_total / 100).toFixed(2),
    );
    if (!input) return;
    const amount = Math.round(Number(input) * 100);
    if (!Number.isFinite(amount) || amount < 1 || amount > o.amount_total)
      return toast.error("Enter a valid refund amount");
    const note = prompt("Reason for the refund (optional)") || null;
    const notify = confirm("Email the customer a refund confirmation?");
    return run(
      `ref-${o.id}`,
      () => refundOrder({ data: { orderId: o.id, refundCents: amount, notify, note } }),
      "Refund recorded",
    );
  };

  const handleStatus = (o: AdminOrder, next: string) => {
    if (next === o.payment_status) return;
    if (!confirm(`Change this payment from "${o.payment_status}" to "${next}"?`)) return;
    return run(`st-${o.id}`, () => setOrderStatus({ data: { orderId: o.id, status: next as any } }), "Status updated");
  };

  const handleDelete = (o: AdminOrder) => {
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    return run(`del-${o.id}`, () => deleteOrder({ data: { orderId: o.id } }), "Order deleted");
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const days = RANGES.find((r) => r.key === range)?.days ?? 0;
    const cutoff = days ? Date.now() - days * 86400000 : 0;
    const list = orders.filter((o) => {
      if (status !== "all" && o.payment_status !== status) return false;
      if (provider !== "all" && (o.provider || "manual") !== provider) return false;
      if (cutoff && new Date(o.created_at).getTime() < cutoff) return false;
      if (!term) return true;
      return [
        o.customer_name,
        o.customer_email,
        o.tour_title,
        o.booking?.tour_title,
        o.id,
        o.booking_id,
        o.stripe_session_id,
        o.stripe_payment_intent_id,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
    return list.sort((a, b) =>
      sort === "amount"
        ? b.amount_total - a.amount_total
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [orders, status, provider, range, q, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const stats = useMemo(() => {
    const paid = orders.filter(
      (o) => o.payment_status === "paid" || o.payment_status === "partially_refunded",
    );
    const grossRevenue = paid.reduce((s, o) => s + o.amount_total, 0);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const thisMonth = paid
      .filter((o) => new Date(o.created_at) >= monthStart)
      .reduce((s, o) => s + o.amount_total, 0);
    // Refunds live on the booking, so count each booking once; standalone
    // refunded orders (no booking) count their own amount.
    const refundedByBooking = new Map<string, number>();
    let refundedStandalone = 0;
    for (const o of orders) {
      if (o.booking) {
        if (o.booking.refund_cents > 0) refundedByBooking.set(o.booking.id, o.booking.refund_cents);
      } else if (o.payment_status === "refunded") {
        refundedStandalone += o.amount_total;
      }
    }
    const refunded =
      Array.from(refundedByBooking.values()).reduce((s, v) => s + v, 0) + refundedStandalone;
    const revenue = Math.max(0, grossRevenue - refunded);
    const outstanding = Array.from(
      new Map(
        orders.filter((o) => o.booking).map((o) => [o.booking!.id, o.booking!.dueCents]),
      ).values(),
    ).reduce((s, v) => s + v, 0);
    return {
      revenue,
      thisMonth,
      refunded,
      outstanding,
      avg: paid.length ? Math.round(revenue / paid.length) : 0,
      counts: STATUSES.reduce(
        (acc, s) => ({ ...acc, [s]: orders.filter((o) => o.payment_status === s).length }),
        { all: orders.length } as Record<string, number>,
      ),
    };
  }, [orders]);

  const exportCsv = () => {
    const head = [
      "Date",
      "Customer",
      "Email",
      "Tour",
      "Provider",
      "Status",
      "Amount EUR",
      "Booking total EUR",
      "Outstanding EUR",
      "Booking ID",
      "Order ID",
    ];
    const rows = filtered.map((o) => [
      new Date(o.created_at).toISOString(),
      o.customer_name || "",
      o.customer_email || "",
      o.tour_title || o.booking?.tour_title || "",
      providerLabel(o.provider),
      o.payment_status,
      (o.amount_total / 100).toFixed(2),
      o.booking ? (o.booking.totalCents / 100).toFixed(2) : "",
      o.booking ? (o.booking.dueCents / 100).toFixed(2) : "",
      o.booking_id || "",
      o.id,
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} orders exported`);
  };

  const kpis = [
    { label: "Total revenue", value: eur(stats.revenue), accent: true },
    { label: "This month", value: eur(stats.thisMonth) },
    { label: "Average order", value: eur(stats.avg) },
    { label: "Refunded", value: eur(stats.refunded) },
    { label: "Outstanding", value: eur(stats.outstanding) },
  ];

  return (
    <AdminShell requires="orders.view">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Revenue</p>
          <h1 className="text-3xl font-display font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every online payment (PayPal, Mollie, Stripe or manual). Paid orders confirm the matching booking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
          >
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <p className={`font-display text-2xl mt-1 ${k.accent ? "text-primary" : ""}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 mb-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search name, email, tour, booking or payment reference"
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All providers</option>
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {providerLabel(p)}
            </option>
          ))}
        </select>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          {RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "date" | "amount")}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="date">Newest first</option>
          <option value="amount">Highest amount</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              status === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary"
            }`}
          >
            {s[0].toUpperCase() + s.slice(1)} <span className="opacity-70">({stats.counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="flex items-center gap-2 font-semibold text-destructive">
            <AlertCircle className="w-4 h-4" /> Orders could not be loaded
          </p>
          <p className="text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <CreditCard className="w-8 h-8 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {orders.length === 0 ? "No payments recorded yet." : "No orders match these filters."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((o) => {
            const b = o.booking;
            const isBusy = busy?.endsWith(o.id);
            return (
              <article
                key={o.id}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-[0_10px_30px_rgba(30,58,95,0.06)] transition-shadow"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-xl">{o.customer_name || "Guest"}</h3>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge(o.payment_status)}`}
                      >
                        {o.payment_status}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                        {providerLabel(o.provider)}
                      </span>
                      {o.kind === "tip" && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-700">
                          Guide tip
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {o.tour_title || b?.tour_title || "—"} ·{" "}
                      {new Date(o.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl text-primary tabular-nums">{eur(o.amount_total)}</p>
                    {b && b.totalCents > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        Tour total {eur(b.totalCents)} ·{" "}
                        {b.dueCents > 0 ? (
                          <span className="text-amber-700 font-semibold">{eur(b.dueCents)} outstanding</span>
                        ) : (
                          <span className="text-emerald-700 font-semibold">fully paid</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-2 text-sm text-foreground mb-4">
                  {o.customer_email && (
                    <button
                      onClick={() => copy(o.customer_email!, "Email")}
                      className="flex items-center gap-2 hover:text-primary text-left"
                    >
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {o.customer_email}
                      <Copy className="w-3 h-3 opacity-50" />
                    </button>
                  )}
                  {(o.travel_date || b?.travel_date) && (
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {new Date((o.travel_date || b?.travel_date)!).toLocaleDateString(undefined, {
                        dateStyle: "full",
                      })}
                      {b?.travel_time ? ` · ${b.travel_time}` : ""}
                    </p>
                  )}
                  {(o.guests ?? b?.guests) != null && (
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      {o.guests ?? b?.guests} guest{(o.guests ?? b?.guests) === 1 ? "" : "s"}
                    </p>
                  )}
                  {(o.stripe_payment_intent_id || o.stripe_session_id) && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <CreditCard className="w-3.5 h-3.5" />
                      {(o.stripe_payment_intent_id || o.stripe_session_id)!.slice(0, 30)}
                    </p>
                  )}
                  {b && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      Booking status: <span className="font-medium text-foreground">{b.status}</span>
                      {b.refund_cents > 0 && <span>· refunded {eur(b.refund_cents)}</span>}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleEmailInvoice(o)}
                    disabled={!o.booking_id || isBusy}
                    title={o.booking_id ? "Email the branded invoice from your domain" : "No linked booking"}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-4 h-4" />
                    Email invoice
                  </button>
                  <button
                    onClick={() => handleDownload(o)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  {b && b.dueCents > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 p-1.5">
                      {[20, 50, 70, 100].map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          aria-pressed={(requestPercent[o.id] ?? 100) === percent}
                          onClick={() =>
                            setRequestPercent((current) => ({ ...current, [o.id]: percent }))
                          }
                          className={`rounded px-2 py-1.5 text-xs font-semibold ${
                            (requestPercent[o.id] ?? 100) === percent
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {percent === 100 ? "Full" : `${percent}%`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleRequestBalance(o)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded bg-foreground px-2.5 py-1.5 text-xs font-semibold text-background disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        Send request
                      </button>
                    </div>
                  )}
                  {o.booking_id && (
                    <Link
                      to="/admin/bookings"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Booking
                    </Link>
                  )}
                  {b?.phone && (
                    <a
                      href={`https://wa.me/${b.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-primary"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                  {canRefund &&
                    (o.payment_status === "paid" || o.payment_status === "partially_refunded") && (
                    <button
                      onClick={() => handleRefund(o)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <Undo2 className="w-4 h-4" />
                      Refund
                    </button>
                  )}
                  <select
                    value={o.payment_status}
                    onChange={(e) => handleStatus(o, e.target.value)}
                    disabled={isBusy}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s[0].toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                  {canRefund && (
                    <button
                      onClick={() => handleDelete(o)}
                      className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <p className="text-muted-foreground">
            Showing {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="rounded-md border border-border bg-card px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={current >= pageCount - 1}
              className="rounded-md border border-border bg-card px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
