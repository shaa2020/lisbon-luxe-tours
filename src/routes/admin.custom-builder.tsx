import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { uploadMediaFile, slugify } from "@/lib/admin-helpers";
import {
  adminListComponents,
  adminUpsertComponent,
  adminDeleteComponent,
} from "@/lib/custom-tour.functions";
import { Plus, Trash2, Save, X, Upload, ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/custom-builder")({
  component: AdminCustomBuilder,
});

type Row = {
  id: string;
  category: "vehicle" | "destination" | "addon" | "duration";
  name: string;
  description: string | null;
  price_cents: number;
  extra_per_guest_cents: number;
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
  extra_per_guest_cents: 0,
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
          extra_per_guest_cents: Math.round(Number(d.extra_per_guest_cents) || 0),
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
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-display text-lg font-bold capitalize">{cat}s</h2>
                <button
                  onClick={() => setEditing({ ...EMPTY, category: cat })}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-accent"
                >
                  <Plus className="w-3.5 h-3.5" /> Add {cat}
                </button>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items yet.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden bg-card">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[520px]">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left px-3 py-2 w-14">Image</th>
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
                              {r.image_url ? (
                                <img
                                  src={r.image_url}
                                  alt=""
                                  className="w-10 h-10 rounded-md object-cover bg-muted"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted grid place-items-center text-muted-foreground">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </td>
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
                            <td className="px-3 py-2 text-right whitespace-nowrap">
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
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editing && (
        <EditModal
          editing={editing}
          onClose={() => setEditing(null)}
          onChange={setEditing}
          onSave={() => save.mutate(editing)}
          saving={save.isPending}
        />
      )}
    </AdminShell>
  );
}

function EditModal({
  editing,
  onClose,
  onChange,
  onSave,
  saving,
}: {
  editing: Draft;
  onClose: () => void;
  onChange: (d: Draft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMediaFile("custom", slugify(editing.name || editing.category), file);
      onChange({ ...editing, image_url: url });
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8 max-h-[calc(100dvh-4rem)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">
            {editing.id ? "Edit component" : "New component"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select
              value={editing.category}
              onChange={(e) =>
                onChange({ ...editing, category: e.target.value as Row["category"] })
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
              onChange={(e) => onChange({ ...editing, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={editing.description ?? ""}
              onChange={(e) => onChange({ ...editing, description: e.target.value })}
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
                  onChange({
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
                  onChange({ ...editing, sort_order: Number(e.target.value) || 0 })
                }
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Image</label>
            <div className="mt-1 flex items-start gap-3">
              {editing.image_url ? (
                <img
                  src={editing.image_url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover bg-muted border border-border"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted grid place-items-center text-muted-foreground border border-border">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  placeholder="https://… (or upload)"
                  value={editing.image_url ?? ""}
                  onChange={(e) => onChange({ ...editing, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploading ? "Uploading…" : "Upload"}
                  </button>
                  {editing.image_url && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...editing, image_url: "" })}
                      className="text-xs px-2.5 py-1.5 rounded-md hover:bg-destructive/10 text-destructive"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={editing.active}
              onChange={(e) => onChange({ ...editing, active: e.target.checked })}
            />
            Active (visible to customers)
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={!editing.name.trim() || saving || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>
    </div>
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
