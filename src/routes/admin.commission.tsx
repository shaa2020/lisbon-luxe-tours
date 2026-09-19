import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Percent, Download, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  getCommissionOverview,
  setCommissionRate,
  recordGuideSettlement,
  deleteGuideSettlement,
} from "@/lib/commission.functions";
import { euro } from "@/lib/booking-ledger";

export const Route = createFileRoute("/admin/commission")({
  component: CommissionPage,
  head: () => ({
    meta: [
      { title: "Commission · Tuk Tuk 24 admin" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

function CommissionPage() {
  const qc = useQueryClient();
  const load = useServerFn(getCommissionOverview);
  const saveRate = useServerFn(setCommissionRate);
  const settle = useServerFn(recordGuideSettlement);
  const unsettle = useServerFn(deleteGuideSettlement);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [guideId, setGuideId] = useState("");
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["commission", from, to, guideId],
    queryFn: () =>
      load({
        data: {
          from: from || null,
          to: to || null,
          guideId: guideId || null,
        },
      }),
  });

  const rate = data?.ratePercent ?? 20;
  const totals = data?.totals;

  const csv = useMemo(() => {
    if (!data) return "";
    const lines = [
      "Guide,Date,Reference,Customer,Tour,Amount,How paid,Collected by guide,Rate %,My commission,Guide share",
    ];
    for (const g of data.guides)
      for (const p of g.payments)
        lines.push(
          [
            g.guideName,
            (p.paidAt || "").slice(0, 10),
            p.reference ?? "",
            (p.customer ?? "").replace(/,/g, " "),
            (p.tour ?? "").replace(/,/g, " "),
            (p.amountCents / 100).toFixed(2),
            p.method,
            p.collectedByGuide ? "yes" : "no",
            p.ratePercent,
            (p.commissionCents / 100).toFixed(2),
            (p.guideShareCents / 100).toFixed(2),
          ].join(","),
        );
    return lines.join("\n");
  }, [data]);

  const downloadCsv = () => {
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-${from || "all"}-${to || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyRate = async () => {
    const percent = Number(rateDraft);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      return toast.error("Enter a rate between 0 and 100");
    setBusy(true);
    try {
      await saveRate({ data: { percent } });
      toast.success(`Commission rate set to ${percent}%`);
      setRateDraft("");
      qc.invalidateQueries({ queryKey: ["commission"] });
    } catch (e: any) {
      toast.error(e?.message || "Could not save the rate");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminShell requires="payments.manage">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Commission</h1>
        <p className="text-sm text-muted-foreground">
          What you keep, what belongs to each guide, and who owes who.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          {(error as Error).message === "Forbidden"
            ? "This page is for the owner only."
            : (error as Error).message}
        </p>
      ) : isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Commission rate</label>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    className={`${field} w-28 pr-7`}
                    inputMode="decimal"
                    value={rateDraft}
                    placeholder={String(rate)}
                    onChange={(e) => setRateDraft(e.target.value)}
                  />
                  <Percent className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <button
                  onClick={applyRate}
                  disabled={busy || !rateDraft}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save rate"}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Currently {rate}%. Changing it affects money recorded from now on.
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-end gap-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">From</label>
                <input
                  type="date"
                  className={field}
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">To</label>
                <input
                  type="date"
                  className={field}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Guide</label>
                <select
                  className={field}
                  value={guideId}
                  onChange={(e) => setGuideId(e.target.value)}
                >
                  <option value="">All guides</option>
                  {data.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={downloadCsv}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Tile
              label="Money received"
              value={euro(totals!.receivedCents)}
              tone="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
            />
            <Tile
              label="My commission"
              value={euro(totals!.commissionCents)}
              tone="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
            />
            <Tile
              label="Guides owe me"
              value={euro(totals!.guideOwesCompanyCents)}
              tone="bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
            />
            <Tile
              label="I owe guides"
              value={euro(totals!.companyOwesGuideCents)}
              tone="bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300"
            />
          </div>

          <div className="space-y-3">
            {data.guides.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No money received in this period yet.
              </p>
            )}
            {data.guides.map((g) => {
              const key = g.guideId ?? "unassigned";
              const open = openGuide === key;
              return (
                <div key={key} className="rounded-xl border border-border bg-card">
                  <button
                    onClick={() => setOpenGuide(open ? null : key)}
                    className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold">{g.guideName}</p>
                      <p className="text-xs text-muted-foreground">
                        {euro(g.receivedByCompanyCents)} received by me ·{" "}
                        {euro(g.receivedByGuideCents)} collected by guide ·{" "}
                        {euro(g.commissionCents)} commission
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {g.netCents >= 0 ? "I owe the guide" : "Guide owes me"}
                      </p>
                      <p className="font-display font-bold text-lg">{euro(Math.abs(g.netCents))}</p>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-border p-4 space-y-4">
                      {g.guideId && (
                        <SettleForm
                          guideId={g.guideId}
                          suggestion={Math.abs(g.netCents)}
                          direction={g.netCents >= 0 ? "payout" : "received"}
                          onDone={() => qc.invalidateQueries({ queryKey: ["commission"] })}
                          settle={settle}
                        />
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="py-1.5 pr-3">Date</th>
                              <th className="py-1.5 pr-3">Booking</th>
                              <th className="py-1.5 pr-3">How paid</th>
                              <th className="py-1.5 pr-3 text-right">Received</th>
                              <th className="py-1.5 pr-3 text-right">My cut</th>
                              <th className="py-1.5 text-right">Guide share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.payments.map((p) => (
                              <tr key={p.id} className="border-t border-border/60">
                                <td className="py-1.5 pr-3 whitespace-nowrap">
                                  {(p.paidAt || "").slice(0, 10)}
                                </td>
                                <td className="py-1.5 pr-3">
                                  <span className="font-medium">{p.reference ?? "—"}</span>
                                  <span className="text-muted-foreground">
                                    {p.customer ? ` · ${p.customer}` : ""}
                                  </span>
                                </td>
                                <td className="py-1.5 pr-3">
                                  {p.method}
                                  {p.collectedByGuide ? " (guide held cash)" : ""}
                                </td>
                                <td className="py-1.5 pr-3 text-right">{euro(p.amountCents)}</td>
                                <td className="py-1.5 pr-3 text-right">
                                  {euro(p.commissionCents)}
                                </td>
                                <td className="py-1.5 text-right">{euro(p.guideShareCents)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {data.settlements.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Settle-ups
              </p>
              <div className="space-y-1.5">
                {data.settlements.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>
                      <span className="font-semibold">{euro(s.amountCents)}</span>{" "}
                      {s.direction === "payout" ? "paid to" : "received from"} {s.guideName} ·{" "}
                      {s.settledAt.slice(0, 10)}
                      {s.note ? ` · ${s.note}` : ""}
                    </span>
                    <button
                      onClick={async () => {
                        try {
                          await unsettle({ data: { id: s.id } });
                          qc.invalidateQueries({ queryKey: ["commission"] });
                        } catch (e: any) {
                          toast.error(e?.message || "Could not remove");
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove settle-up"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}

function SettleForm({
  guideId,
  suggestion,
  direction,
  onDone,
  settle,
}: {
  guideId: string;
  suggestion: number;
  direction: "payout" | "received";
  onDone: () => void;
  settle: (args: { data: any }) => Promise<any>;
}) {
  const [amount, setAmount] = useState((suggestion / 100).toFixed(2));
  const [dir, setDir] = useState(direction);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!cents || cents < 1) return toast.error("Enter an amount");
    setBusy(true);
    try {
      await settle({
        data: { guide_id: guideId, direction: dir, amount_cents: cents, note: note || null },
      });
      toast.success("Settle-up recorded");
      setNote("");
      onDone();
    } catch (e: any) {
      toast.error(e?.message || "Could not record it");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2 sm:grid-cols-4 rounded-lg border border-border bg-muted/30 p-3">
      <select className={field} value={dir} onChange={(e) => setDir(e.target.value as any)}>
        <option value="payout">I paid the guide</option>
        <option value="received">Guide handed money to me</option>
      </select>
      <input
        className={field}
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount €"
      />
      <input
        className={field}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
      />
      <button
        onClick={submit}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : "Record settle-up"}
      </button>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-xl p-4 ${tone}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] opacity-80">{label}</p>
      <p className="font-display font-bold text-xl mt-1">{value}</p>
    </div>
  );
}
