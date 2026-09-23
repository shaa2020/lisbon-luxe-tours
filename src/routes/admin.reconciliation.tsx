import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Scale,
  Search,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import { AdminShell, AdminPageHeader, AdminCard } from "@/components/admin/AdminShell";
import {
  adminReconciliation,
  adminVerifyPaymentWithProvider,
  adminSettleBalance,
  adminEditSettlement,
  adminUndoSettlement,
  SETTLEMENT_METHODS,
  type ReconBooking,
  type ReconIssue,
  type ReconSettlement,
} from "@/lib/reconciliation.functions";
import type { SettlementStatus } from "@/lib/settlement.server";

export const Route = createFileRoute("/admin/reconciliation")({
  head: () => ({ meta: [{ title: "Payment reconciliation — Admin" }] }),
  component: () => (
    <AdminShell requires="orders.view">
      <ReconciliationBody />
    </AdminShell>
  ),
});

const ISSUE_LABELS: Record<ReconIssue, string> = {
  booking_marked_paid_without_payment: "Marked paid, no confirmed payment",
  payment_collected_but_booking_unpaid: "Money received, booking not marked paid",
  amount_mismatch: "Marked fully paid but money still due",
  refund_exceeds_collected: "Refunded more than was collected",
  payment_stuck_pending: "Payment left unconfirmed over 24h",
  orphan_payment: "Payment not linked to a booking",
  failed_attempt_only: "Only failed attempts — nothing collected",
  overpaid: "More money received than the booking total",
};

const SETTLEMENT_BADGE: Record<SettlementStatus, { label: string; cls: string }> = {
  fully_settled: {
    label: "Fully settled",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  partially_paid: {
    label: "Partially paid",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  pending_balance: {
    label: "Pending balance",
    cls: "bg-muted text-muted-foreground",
  },
  discrepancy: {
    label: "Discrepancy",
    cls: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
};

function methodLabel(v: string) {
  return SETTLEMENT_METHODS.find((m) => m.value === v)?.label ?? v;
}

const RANGES = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
  { label: "All time", days: 0 },
] as const;

function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function day(v: string | null) {
  return v ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

type Filter =
  | "all"
  | "issues"
  | "outstanding"
  | "deposits"
  | "refunded"
  | "pending_balance"
  | "partially_paid"
  | "fully_settled";

function ReconciliationBody() {
  const qc = useQueryClient();
  const fetchReport = useServerFn(adminReconciliation);
  const verify = useServerFn(adminVerifyPaymentWithProvider);

  const [days, setDays] = useState<number>(365);
  const [filter, setFilter] = useState<Filter>("all");
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [settling, setSettling] = useState<ReconBooking | null>(null);

  const report = useQuery({
    queryKey: ["admin-reconciliation", days],
    queryFn: () => fetchReport({ data: { days } }),
  });

  const verifyM = useMutation({
    mutationFn: (orderId: string) => verify({ data: { orderId } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["admin-reconciliation"] });
      toast.success(
        r.changed
          ? `${r.provider} says "${r.providerStatus}" — record corrected.`
          : `${r.provider} confirms "${r.providerStatus}". Records already match.`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    const all = report.data?.bookings ?? [];
    const q = term.trim().toLowerCase();
    return all.filter((b) => {
      if (filter === "issues" && b.issues.length === 0) return false;
      if (filter === "outstanding" && (b.outstandingCents <= 0 || b.status === "cancelled")) return false;
      if (filter === "deposits" && !b.isDeposit) return false;
      if (filter === "refunded" && b.refundCents <= 0) return false;
      if (
        (filter === "pending_balance" || filter === "partially_paid" || filter === "fully_settled") &&
        b.settlement !== filter
      )
        return false;
      if (!q) return true;
      return [b.customerName, b.email, b.tourTitle, b.bookingId, ...b.payments.map((p) => p.reference)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [report.data, filter, term]);

  const t = report.data?.totals;
  const issueCount = (report.data?.bookings ?? []).filter((b) => b.issues.length > 0).length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Money"
        title="Payment reconciliation"
        description="Every booking checked against every PayPal, Mollie, Stripe and manual payment — deposits, refunds and what's still owed."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setDays(r.days)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  days === r.days
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => report.refetch()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${report.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        }
      />

      {report.isLoading ? (
        <div className="grid min-h-[40vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : report.isError ? (
        <AdminCard className="p-4">
          <p className="text-sm text-destructive">
            {(report.error as Error)?.message || "Could not load the reconciliation report."}
          </p>
        </AdminCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Booked value" value={money(t?.bookedValueCents ?? 0)} tone="sky" note={`${t?.bookings ?? 0} bookings`} />
            <Kpi label="Collected online" value={money(t?.onlineCents ?? 0)} tone="emerald" note="Confirmed by the provider" />
            <Kpi label="Collected in person" value={money(t?.manualCents ?? 0)} tone="violet" note="Cash or card to a guide, bank, other" />
            <Kpi label="Outstanding" value={money(t?.outstandingCents ?? 0)} tone="rose" note={`${money(t?.depositsOpenCents ?? 0)} of it deposit balances`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total paid" value={money(t?.collectedCents ?? 0)} tone="slate" note={`Refunded ${money(t?.refundedCents ?? 0)} · net ${money(t?.netCents ?? 0)}`} />
            <Kpi label="Awaiting confirmation" value={money(t?.pendingCents ?? 0)} tone="slate" note="Started but never confirmed" />
            <Kpi label="Fully settled" value={String(t?.fullySettled ?? 0)} tone="emerald" note={`${t?.partiallyPaid ?? 0} partly paid · ${t?.pendingBalance ?? 0} pending`} />
            <Kpi
              label="Discrepancies"
              value={String(issueCount)}
              tone={issueCount ? "rose" : "emerald"}
              note={issueCount ? "Bookings needing a look" : "Everything balances"}
            />
          </div>

          <AdminCard className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["all", "All bookings"],
                    ["issues", `Discrepancies (${issueCount})`],
                    ["pending_balance", "Pending balance"],
                    ["partially_paid", "Partially paid"],
                    ["fully_settled", "Fully settled"],
                    ["outstanding", "Money owed"],
                    ["deposits", "Deposits paid"],
                    ["refunded", "Refunded"],
                  ] as [Filter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      filter === key
                        ? "bg-foreground text-background"
                        : "border border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Name, email, tour or PayPal reference"
                  className="h-9 w-64 rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </AdminCard>

          {report.data?.byProvider.length ? (
            <AdminCard className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Collected by payment method</h2>
              <div className="flex flex-wrap gap-3">
                {report.data.byProvider.map((p) => (
                  <div key={p.provider} className="rounded-xl border border-border px-4 py-3">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{p.provider}</p>
                    <p className="text-lg font-bold text-foreground">{money(p.collectedCents)}</p>
                    <p className="text-xs text-muted-foreground">{p.count} transactions</p>
                  </div>
                ))}
              </div>
            </AdminCard>
          ) : null}

          <div className="space-y-3">
            {rows.length === 0 ? (
              <AdminCard className="p-4">
                <p className="text-sm text-muted-foreground">No bookings match this view.</p>
              </AdminCard>
            ) : (
              rows.map((b) => (
                <BookingRow
                  key={b.bookingId}
                  b={b}
                  expanded={open === b.bookingId}
                  onToggle={() => setOpen(open === b.bookingId ? null : b.bookingId)}
                  onVerify={(orderId) => verifyM.mutate(orderId)}
                  verifying={verifyM.isPending}
                  onSettle={() => setSettling(b)}
                />
              ))
            )}
          </div>

          {report.data?.orphans.length ? (
            <AdminCard className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Payments not linked to a booking</h2>
              <div className="space-y-2">
                {report.data.orphans.map((o) => (
                  <div
                    key={o.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-foreground">
                      {o.customerName || o.email || "Unknown customer"}
                    </span>
                    <span className="text-muted-foreground">
                      {o.provider} · {o.status} · {money(o.amountCents)} · {day(o.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => verifyM.mutate(o.id)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                    >
                      Check with provider
                    </button>
                  </div>
                ))}
              </div>
            </AdminCard>
          ) : null}
        </div>
      )}

      {settling ? (
        <SettleDialog
          booking={settling}
          onClose={() => setSettling(null)}
          onDone={() => {
            setSettling(null);
            qc.invalidateQueries({ queryKey: ["admin-reconciliation"] });
          }}
        />
      ) : null}
    </>
  );
}

function Kpi({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone: "sky" | "emerald" | "amber" | "rose" | "slate" | "violet";
}) {
  const tones: Record<string, string> = {
    sky: "bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900",
    emerald: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    rose: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900",
    violet: "bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-900",
    slate: "bg-muted/50 border-border",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
      {note ? <p className="mt-0.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

function BookingRow({
  b,
  expanded,
  onToggle,
  onVerify,
  verifying,
  onSettle,
}: {
  b: ReconBooking;
  expanded: boolean;
  onToggle: () => void;
  onVerify: (orderId: string) => void;
  verifying: boolean;
  onSettle: () => void;
}) {
  const balanced = b.issues.length === 0;
  const badge = SETTLEMENT_BADGE[b.settlement];
  return (
    <div className={`rounded-2xl border bg-card ${balanced ? "border-border" : "border-rose-300 dark:border-rose-900"}`}>
      <button type="button" onClick={onToggle} className="w-full px-4 py-3 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
              {balanced ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              )}
              {b.customerName || "Unnamed"}
              <span className="text-xs font-normal text-muted-foreground">{b.tourTitle || "—"}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                {badge.label}
              </span>
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {b.bookingReference ? `${b.bookingReference} · ` : ""}Travel {day(b.travelDate)} · Booked{" "}
              {day(b.createdAt)} · {b.status || "—"} / {b.paymentStatus || "unpaid"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Cell label="Booking total" value={money(b.totalCents)} />
            <Cell label="Deposit / online" value={money(b.onlineCents)} tone="text-emerald-600" />
            <Cell label="In person" value={money(b.manualCents)} tone="text-violet-600" />
            <Cell label="Amount paid" value={money(b.collectedCents)} tone="text-emerald-600" />
            {b.refundCents > 0 ? <Cell label="Refunded" value={money(b.refundCents)} tone="text-amber-600" /> : null}
            <Cell
              label="Remaining"
              value={money(b.outstandingCents)}
              tone={b.outstandingCents > 0 ? "text-rose-600" : "text-muted-foreground"}
            />
          </div>
        </div>
        {!balanced && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {b.issues.map((i) => (
              <span
                key={i}
                className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
              >
                {ISSUE_LABELS[i]}
              </span>
            ))}
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {b.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment attempts recorded for this booking.</p>
          ) : (
            <div className="space-y-2">
              {b.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">
                      {p.provider} · {money(p.amountCents)}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          p.status === "paid"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : p.status === "failed"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {p.status}
                      </span>
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      {p.reference || "no reference"} · {day(p.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={() => onVerify(p.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary disabled:opacity-60"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    Check with provider
                  </button>
                </div>
              ))}
            </div>
          )}

          <SettlementList bookingId={b.bookingId} settlements={b.settlements} />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] text-muted-foreground">{b.bookingId}</p>
            <button
              type="button"
              onClick={onSettle}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Wallet className="h-3.5 w-3.5" />
              {b.outstandingCents > 0 ? `Settle balance (${money(b.outstandingCents)})` : "Record a payment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Manually recorded money for a booking, with edit and undo. */
function SettlementList({
  bookingId,
  settlements,
}: {
  bookingId: string;
  settlements: ReconSettlement[];
}) {
  const qc = useQueryClient();
  const edit = useServerFn(adminEditSettlement);
  const undo = useServerFn(adminUndoSettlement);
  const [editing, setEditing] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-reconciliation"] });

  const editM = useMutation({
    mutationFn: (v: { id: string; amount_cents: number; notes: string | null }) => edit({ data: v }),
    onSuccess: () => {
      setEditing(null);
      refresh();
      toast.success("Settlement updated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoM = useMutation({
    mutationFn: (id: string) => undo({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Settlement undone — the booking balance was recalculated.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const manual = settlements.filter((s) => !s.linkedToOrder);
  if (manual.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Payments collected in person
      </h3>
      <div className="space-y-2">
        {manual.map((s) => (
          <div key={s.id} className="rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-foreground">
                  {money(s.amountCents)} · {methodLabel(s.method)}
                  {s.collectedBy ? ` · collected by ${s.collectedBy}` : ""}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {day(s.paidAt)}
                  {s.notes ? ` · ${s.notes}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(editing === s.id ? null : s.id);
                    setAmount((s.amountCents / 100).toFixed(2));
                    setNotes(s.notes || "");
                  }}
                  className="rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={undoM.isPending}
                  onClick={() => {
                    if (confirm("Undo this payment? The booking balance will be recalculated.")) {
                      undoM.mutate(s.id);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold text-rose-600 hover:border-rose-400 disabled:opacity-60"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo
                </button>
              </div>
            </div>

            {editing === s.id ? (
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <label className="text-xs">
                  <span className="mb-1 block text-muted-foreground">Amount (€)</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    className="h-9 w-28 rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="min-w-[12rem] flex-1 text-xs">
                  <span className="mb-1 block text-muted-foreground">Note</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:border-primary"
                  />
                </label>
                <button
                  type="button"
                  disabled={editM.isPending}
                  onClick={() => {
                    const cents = Math.round(Number(amount.replace(",", ".")) * 100);
                    if (!Number.isFinite(cents) || cents <= 0) {
                      toast.error("Enter a valid amount.");
                      return;
                    }
                    editM.mutate({ id: s.id, amount_cents: cents, notes: notes || null });
                  }}
                  className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Every change is kept in the activity log — booking {bookingId.slice(0, 8)}.
      </p>
    </div>
  );
}

/** Records the remaining balance against a booking. */
function SettleDialog({
  booking,
  onClose,
  onDone,
}: {
  booking: ReconBooking;
  onClose: () => void;
  onDone: () => void;
}) {
  const settle = useServerFn(adminSettleBalance);
  const remaining = booking.outstandingCents;
  const [amount, setAmount] = useState((Math.max(remaining, 0) / 100).toFixed(2));
  const [method, setMethod] = useState<string>("guide_cash");
  const [collectedBy, setCollectedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 16));

  const save = useMutation({
    mutationFn: (v: {
      booking_id: string;
      amount_cents: number;
      method: string;
      collected_by: string | null;
      notes: string | null;
      paid_at: string;
    }) => settle({ data: v as never }),
    onSuccess: () => {
      toast.success("Payment recorded — the booking balance is up to date.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cents = Math.round(Number(amount.replace(",", ".")) * 100);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Settle balance</h2>
            <p className="text-xs text-muted-foreground">
              {booking.customerName || "Booking"} · {booking.tourTitle || "—"}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Mini label="Total" value={money(booking.totalCents)} />
          <Mini label="Paid" value={money(booking.collectedCents)} />
          <Mini label="Remaining" value={money(remaining)} />
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs">
              <span className="mb-1 block text-muted-foreground">Amount (€)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            {remaining > 0 ? (
              <button
                type="button"
                onClick={() => setAmount((remaining / 100).toFixed(2))}
                className="h-10 rounded-lg border border-border px-3 text-xs font-semibold hover:border-primary"
              >
                Full balance
              </button>
            ) : null}
          </div>

          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">How was it paid?</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              {SETTLEMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">Who collected it?</span>
            <input
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              placeholder="Guide or staff name"
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">When</span>
            <input
              type="datetime-local"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-primary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              if (!Number.isFinite(cents) || cents <= 0) {
                toast.error("Enter a valid amount.");
                return;
              }
              save.mutate({
                booking_id: booking.bookingId,
                amount_cents: cents,
                method,
                collected_by: collectedBy.trim() || null,
                notes: notes.trim() || null,
                paid_at: new Date(paidAt).toISOString(),
              });
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Record payment
          </button>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`font-semibold ${tone || "text-foreground"}`}>{value}</p>
    </div>
  );
}
