import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { minutesToLabel, type TourOptionRow } from "@/lib/tour-options";

type Row = {
  id: string;
  duration_minutes: number;
  duration_label: string;
  price: number;
  sale_price: number | null;
  short_description: string;
  badge: string;
  is_recommended: boolean;
  is_best_value: boolean;
  sort_order: number;
  is_active: boolean;
};

const BADGES = ["none", "most_popular", "best_value", "recommended"];

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

function toRow(r: TourOptionRow): Row {
  return {
    id: r.id,
    duration_minutes: Number(r.duration_minutes) || 60,
    duration_label: r.duration_label || minutesToLabel(Number(r.duration_minutes) || 60),
    price: Number(r.price) || 0,
    sale_price: r.sale_price == null ? null : Number(r.sale_price),
    short_description: r.short_description || "",
    badge: r.badge || "none",
    is_recommended: !!r.is_recommended,
    is_best_value: !!r.is_best_value,
    sort_order: Number(r.sort_order) || 0,
    is_active: r.is_active !== false,
  };
}

/**
 * Optional multi-duration options for one tour. Tours with no options keep
 * working exactly as before using the tour's own duration and price.
 */
export function TourOptionsManager({ tourId, defaultPrice = 0 }: { tourId: string; defaultPrice?: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("tour_options")
        .select("*")
        .eq("tour_id", tourId)
        .order("sort_order", { ascending: true });
      if (error) toast.error(error.message);
      setRows(((data ?? []) as unknown as TourOptionRow[]).map(toRow));
      setLoading(false);
    })();
  }, [tourId]);

  const patch = (id: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const addWith = (minutes: number, price: number) =>
    setRows((rs) => [
      ...rs,
      {
        id: `new-${crypto.randomUUID()}`,
        duration_minutes: minutes,
        duration_label: minutesToLabel(minutes),
        price,
        sale_price: null,
        short_description: "",
        badge: "none",
        is_recommended: false,
        is_best_value: false,
        sort_order: rs.length,
        is_active: true,
      },
    ]);

  const add = () => addWith(120, 0);

  const QUICK_DURATIONS = [60, 90, 120, 240, 360, 480];

  const move = (i: number, dir: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return rs;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((r, idx) => ({ ...r, sort_order: idx }));
    });

  const remove = async (row: Row) => {
    if (!confirm(`Delete the "${row.duration_label}" option? Existing bookings keep their details.`))
      return;
    if (!row.id.startsWith("new-")) {
      const { error } = await supabase.from("tour_options").delete().eq("id", row.id);
      if (error) return toast.error(error.message);
    }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success("Option deleted");
  };

  const saveAll = async () => {
    for (const r of rows) {
      if (!r.duration_label.trim()) return toast.error("Every option needs a duration label.");
      if (r.price <= 0) return toast.error(`Set a price for "${r.duration_label}".`);
    }
    setSaving(true);
    const payloads = rows.map((r, idx) => ({
      tour_id: tourId,
      duration_minutes: Math.max(1, Math.round(r.duration_minutes)),
      duration_label: r.duration_label.trim(),
      price: r.price,
      sale_price: r.sale_price && r.sale_price > 0 ? r.sale_price : null,
      short_description: r.short_description || null,
      badge: BADGES.includes(r.badge) ? r.badge : "none",
      is_recommended: r.is_recommended,
      is_best_value: r.is_best_value,
      sort_order: idx,
      is_active: r.is_active,
    }));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const res = r.id.startsWith("new-")
        ? await supabase.from("tour_options").insert(payloads[i] as never).select("id").single()
        : await supabase.from("tour_options").update(payloads[i] as never).eq("id", r.id).select("id").single();
      if (res.error) {
        setSaving(false);
        return toast.error(res.error.message);
      }
      if (r.id.startsWith("new-")) patch(r.id, { id: (res.data as { id: string }).id });
    }
    setSaving(false);
    toast.success("Durations saved");
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading durations…</p>;

  return (
    <div id="tour-options-manager" className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Duration options
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Optional. Add two or more durations and guests can pick one. Leave empty to keep this
            tour exactly as it is today.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add duration
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Quick add:</span>
        {QUICK_DURATIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => addWith(m, defaultPrice)}
            className="rounded-md border border-border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-medium"
          >
            + {minutesToLabel(m)}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No duration options yet.</p>
      )}

      {rows.map((r, i) => (
        <div key={r.id} className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Option {i + 1}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} className="p-1.5 rounded hover:bg-muted" aria-label="Move up">
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(i, 1)} className="p-1.5 rounded hover:bg-muted" aria-label="Move down">
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => remove(r)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive" aria-label="Delete option">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground space-y-1 block">
              <span>Minutes</span>
              <input
                type="number"
                min={1}
                value={r.duration_minutes}
                onChange={(e) => {
                  const m = Number(e.target.value) || 0;
                  patch(r.id, { duration_minutes: m, duration_label: minutesToLabel(m) });
                }}
                className={input}
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1 block">
              <span>Shown as</span>
              <input
                value={r.duration_label}
                onChange={(e) => patch(r.id, { duration_label: e.target.value })}
                className={input}
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1 block">
              <span>Price per person (€)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={r.price}
                onChange={(e) => patch(r.id, { price: Number(e.target.value) || 0 })}
                className={input}
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1 block">
              <span>Sale price (€) — empty for none</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={r.sale_price ?? ""}
                onChange={(e) =>
                  patch(r.id, { sale_price: e.target.value === "" ? null : Number(e.target.value) })
                }
                className={input}
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1 block sm:col-span-2">
              <span>Short description</span>
              <textarea
                rows={2}
                value={r.short_description}
                onChange={(e) => patch(r.id, { short_description: e.target.value })}
                className={input}
              />
            </label>
            <label className="text-xs text-muted-foreground space-y-1 block">
              <span>Badge</span>
              <select
                value={r.badge}
                onChange={(e) => patch(r.id, { badge: e.target.value })}
                className={input}
              >
                {BADGES.map((b) => (
                  <option key={b} value={b}>
                    {b === "none" ? "No badge" : b.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  onChange={(e) => patch(r.id, { is_active: e.target.checked })}
                />
                <span>Active</span>
              </label>
            </div>
          </div>
        </div>
      ))}

      {rows.length > 0 && (
        <button
          type="button"
          onClick={saveAll}
          disabled={saving}
          className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save durations"}
        </button>
      )}
    </div>
  );
}
