import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListComponents,
  adminUpsertComponent,
  adminDeleteComponent,
} from "@/lib/custom-tour.functions";
import { Plus, Trash2, Save, X } from "lucide-react";

export const Route = createFileRoute("/admin/custom-builder")({
  component: AdminCustomBuilder,
});

type Row = {
  id: string;
  category: "vehicle" | "destination" | "addon" | "duration";
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  sort_order: number;
  active: boolean;
};

const CATS: Row["category"][] = ["vehicle", "duration", "destination", "addon"];

type Draft = Omit<Row, "id"> & { id?: string };

const EMPTY: Draft = {
  category: "addon",
  name: "",
  description: "",
  price_cents: 0,
  image_url: "",
  sort_order: 0,
  active: true,
};

function AdminCustomBuilder() {
  const list = useServerFn(adminListComponents);
  const upsert = useServerFn(adminUpsertComponent);
  const del = useServerFn(adminDeleteComponent);
  const qc = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "custom-components"],
    queryFn: () => list(),
  });

  const [editing, setEditing] = useState<Draft | null>(null);

  const save = useMutation({
    mutationFn: (d: Draft) =>
      upsert({
        data: {
          id: d.id || null,
          category: d.category,
          name: d.name,
          description: d.description || null,
          price_cents: Math.round(Number(d.price_cents) || 0),
          image_url: d.image_url || null,
          sort_order: Math.round(Number(d.sort_order) || 0),
          active: d.active,
        },
      }),
    onSuccess: () => {
      toast.success("Saved");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "custom-components"] });
      qc.invalidateQueries({ queryKey: ["custom-tour-components"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "custom-components"] });
      qc.invalidateQueries({ queryKey: ["custom-tour-components"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <AdminShell>
      <HeroEditor />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold">Custom Tour Builder</h1>
          <p className="text-sm text-muted-foreground">
            Manage the components customers can pick from.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Add component
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

      <div className="space-y-8">
        {CATS.map((cat) => {
          const items = (rows as Row[]).filter((r) => r.category === cat);
          return (
            <div key={cat}>
              <h2 className="font-display text-lg font-bold capitalize mb-3">{cat}s</h2>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items yet.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Name</th>
                        <th className="text-right px-3 py-2">Price (€)</th>
                        <th className="text-center px-3 py-2 hidden md:table-cell">Order</th>
                        <th className="text-center px-3 py-2">Active</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r) => (
                        <tr key={r.id} className="border-t border-border">
                          <td className="px-3 py-2">
                            <div className="font-medium">{r.name}</div>
                            {r.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                                {r.description}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {(r.price_cents / 100).toFixed(0)}
                          </td>
                          <td className="px-3 py-2 text-center hidden md:table-cell">
                            {r.sort_order}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                r.active ? "bg-emerald-500" : "bg-muted-foreground/40"
                              }`}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => setEditing({ ...r, description: r.description ?? "", image_url: r.image_url ?? "" })}
                              className="text-xs px-2 py-1 rounded hover:bg-accent"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${r.name}"?`)) remove.mutate(r.id);
                              }}
                              className="text-xs px-2 py-1 rounded hover:bg-destructive/10 text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">
                {editing.id ? "Edit component" : "New component"}
              </h3>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-accent rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value as Row["category"] })
                  }
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description</label>
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Price (€)</label>
                  <input
                    type="number"
                    min={0}
                    value={(editing.price_cents / 100).toString()}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        price_cents: Math.round((Number(e.target.value) || 0) * 100),
                      })
                    }
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Sort order</label>
                  <input
                    type="number"
                    min={0}
                    value={editing.sort_order}
                    onChange={(e) =>
                      setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })
                    }
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />
                Active (visible to customers)
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => save.mutate(editing)}
                disabled={!editing.name.trim() || save.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function HeroEditor() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "custom-tour-hero"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("custom_tour_eyebrow, custom_tour_title, custom_tour_subtitle")
        .eq("id", true as any)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || {};
    },
  });

  const [form, setForm] = useState({ eyebrow: "", title: "", subtitle: "" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (data && !loaded) {
      setForm({
        eyebrow: data.custom_tour_eyebrow ?? "",
        title: data.custom_tour_title ?? "",
        subtitle: data.custom_tour_subtitle ?? "",
      });
      setLoaded(true);
    }
  }, [data, loaded]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert({
        id: true,
        custom_tour_eyebrow: form.eyebrow.trim() || null,
        custom_tour_title: form.title.trim() || null,
        custom_tour_subtitle: form.subtitle.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Hero saved");
      qc.invalidateQueries({ queryKey: ["admin", "custom-tour-hero"] });
      qc.invalidateQueries({ queryKey: ["site-brand"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-8">
      <div className="mb-3">
        <h2 className="font-display text-lg font-bold">Custom Tour page hero</h2>
        <p className="text-xs text-muted-foreground">
          Edit the text shown at the top of <code>/tours/custom</code>. Leave blank to use the
          defaults.
        </p>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Eyebrow (small caps line)
            </label>
            <input
              value={form.eyebrow}
              onChange={(e) => setForm((f) => ({ ...f, eyebrow: e.target.value }))}
              placeholder="Build your own"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Headline</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Design Your Private Lisbon Tour"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-semibold"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subtitle</label>
            <textarea
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              rows={2}
              placeholder="Pick your vehicle, destinations, and extras…"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-y"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save hero
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
