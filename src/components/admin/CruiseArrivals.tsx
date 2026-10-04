import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ship, RefreshCw, Plus, Trash2, Pencil, Users, MessageCircle, AlertTriangle } from "lucide-react";
import { AdminCard } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  listCruiseCalls,
  refreshCruiseSchedule,
  saveCruiseCall,
  deleteCruiseCall,
  type CruiseCall,
} from "@/lib/cruise.functions";

const nf = new Intl.NumberFormat("en-GB");

function level(pax: number) {
  if (pax >= 5000) return { label: "Busy cruise day", cls: "bg-destructive/10 text-destructive border-destructive/30" };
  if (pax >= 2500) return { label: "Moderate", cls: "bg-accent/15 text-foreground border-accent/40" };
  return { label: "Quiet", cls: "bg-muted text-muted-foreground border-border" };
}

function dayLabel(date: string, today: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const t = new Date(`${today}T12:00:00Z`);
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  const pretty = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  return diff === 0 ? `Today · ${pretty}` : diff === 1 ? `Tomorrow · ${pretty}` : pretty;
}

type Form = { id?: string; ship_name: string; cruise_line: string; passengers: string; arrival_date: string; arrival_time: string; departure_time: string; terminal: string };
const empty = (date: string): Form => ({ ship_name: "", cruise_line: "", passengers: "", arrival_date: date, arrival_time: "", departure_time: "", terminal: "" });

export function CruiseArrivals() {
  const qc = useQueryClient();
  const list = useServerFn(listCruiseCalls);
  const refresh = useServerFn(refreshCruiseSchedule);
  const save = useServerFn(saveCruiseCall);
  const remove = useServerFn(deleteCruiseCall);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["cruise-calls"],
    queryFn: () => list({ data: { days: 14 } }),
  });
  const calls = data?.calls ?? [];
  const today = data?.today ?? "";

  const byDay = new Map<string, CruiseCall[]>();
  for (const c of calls) byDay.set(c.arrival_date, [...(byDay.get(c.arrival_date) ?? []), c]);
  const days = [...byDay.entries()];
  const visible = showAll ? days : days.slice(0, 3);

  async function doRefresh() {
    setBusy(true);
    try {
      const r = await refresh();
      toast.success(`Schedule updated — ${r.saved} ship calls`);
      qc.invalidateQueries({ queryKey: ["cruise-calls"] });
    } catch (e) {
      toast.error((e as Error).message || "Couldn't update the schedule");
    } finally {
      setBusy(false);
    }
  }

  async function doSave() {
    if (!form) return;
    try {
      await save({
        data: {
          id: form.id,
          ship_name: form.ship_name,
          cruise_line: form.cruise_line || null,
          passengers: form.passengers ? Number(form.passengers) : null,
          arrival_date: form.arrival_date,
          arrival_time: form.arrival_time || null,
          departure_time: form.departure_time || null,
          terminal: form.terminal || null,
        },
      });
      toast.success("Ship saved");
      setForm(null);
      qc.invalidateQueries({ queryKey: ["cruise-calls"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function doDelete(id: string) {
    if (!confirm("Remove this ship call?")) return;
    await remove({ data: { id } });
    qc.invalidateQueries({ queryKey: ["cruise-calls"] });
  }

  function whatsappText(date: string, list: CruiseCall[]) {
    const total = list.reduce((s, c) => s + (c.passengers ?? 0), 0);
    const lines = list.map(
      (c) => `• ${c.ship_name}${c.passengers ? ` (${nf.format(c.passengers)} pax)` : ""} ${c.arrival_time ?? "?"}–${c.departure_time ?? "?"}`,
    );
    return `Cruise alert ${dayLabel(date, today)}\n${lines.join("\n")}\nTotal ≈ ${nf.format(total)} passengers in Lisbon. Please be ready near the cruise terminal.`;
  }

  return (
    <AdminCard className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-primary" strokeWidth={1.75} />
          <h2 className="font-semibold">Lisbon cruise arrivals</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setForm(empty(today))}>
            <Plus className="h-4 w-4" /> Add
          </Button>
          <Button size="sm" variant="outline" onClick={doRefresh} disabled={busy}>
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {!isLoading && !error && days.length === 0 && (
        <p className="text-sm text-muted-foreground">No ships in the next 14 days yet. Press Refresh to load the published schedule.</p>
      )}

      <div className="space-y-3">
        {visible.map(([date, list]) => {
          const total = list.reduce((s, c) => s + (c.passengers ?? 0), 0);
          const lv = level(total);
          return (
            <div key={date} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="font-medium text-sm">{dayLabel(date, today)}</div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${lv.cls}`}>
                    {total >= 5000 && <AlertTriangle className="h-3 w-3" />}
                    {lv.label} · {nf.format(total)} pax
                  </span>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(whatsappText(date, list))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Share
                  </a>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.ship_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[c.cruise_line, c.terminal].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right text-xs">
                        <div className="tabular-nums">{c.arrival_time ?? "--:--"} → {c.departure_time ?? "--:--"}
                          {c.departure_date && c.departure_date !== c.arrival_date && <span className="text-muted-foreground"> (next day)</span>}</div>
                        {c.passengers != null && (
                          <div className="text-muted-foreground inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {nf.format(c.passengers)}
                          </div>
                        )}
                      </div>
                      <button
                        aria-label="Edit"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setForm({
                            id: c.id,
                            ship_name: c.ship_name,
                            cruise_line: c.cruise_line ?? "",
                            passengers: c.passengers?.toString() ?? "",
                            arrival_date: c.arrival_date,
                            arrival_time: c.arrival_time ?? "",
                            departure_time: c.departure_time ?? "",
                            terminal: c.terminal ?? "",
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button aria-label="Remove" className="text-muted-foreground hover:text-destructive" onClick={() => doDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {days.length > 3 && (
        <button className="mt-3 text-sm text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : `Show all ${days.length} days`}
        </button>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Source: published schedule at cruisedig.com; times can change with weather.
        {data?.lastSync && ` Last updated ${new Date(data.lastSync).toLocaleString("en-GB", { timeZone: "Europe/Lisbon" })}.`}
      </p>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit ship call" : "Add ship call"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <Input placeholder="Ship name" value={form.ship_name} onChange={(e) => setForm({ ...form, ship_name: e.target.value })} />
              <Input placeholder="Cruise line" value={form.cruise_line} onChange={(e) => setForm({ ...form, cruise_line: e.target.value })} />
              <Input type="number" placeholder="Passengers" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} />
              <Input type="date" value={form.arrival_date} onChange={(e) => setForm({ ...form, arrival_date: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-muted-foreground">Arrives<Input type="time" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} /></label>
                <label className="text-xs text-muted-foreground">Departs<Input type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} /></label>
              </div>
              <Input placeholder="Terminal (e.g. Lisbon Cruise Port, Santa Apolónia)" value={form.terminal} onChange={(e) => setForm({ ...form, terminal: e.target.value })} />
              <Button onClick={doSave} disabled={!form.ship_name || !form.arrival_date}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminCard>
  );
}
