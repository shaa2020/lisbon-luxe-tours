import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { slugify, uploadMediaFile } from "@/lib/admin-helpers";
import {
  SeoFieldsEditor,
  emptySeo,
  seoFromRow,
  seoToPayload,
  type SeoFormValue,
} from "@/components/admin/SeoFieldsEditor";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/destinations")({
  component: DestinationsAdmin,
});

type Section = { heading: string; body: string };
type Faq = { q: string; a: string };

type Form = {
  id: string | null;
  slug: string;
  name: string;
  heading: string;
  intro: string;
  image_url: string | null;
  body_sections: Section[];
  faqs: Faq[];
  related_tour_slugs: string;
  published: boolean;
  sort_order: number;
  last_verified_at: string;
};

const empty: Form = {
  id: null,
  slug: "",
  name: "",
  heading: "",
  intro: "",
  image_url: null,
  body_sections: [],
  faqs: [],
  related_tour_slugs: "",
  published: false,
  sort_order: 0,
  last_verified_at: "",
};

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function DestinationsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [seo, setSeo] = useState<SeoFormValue>(emptySeo);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Record<string, unknown>[];
    },
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["admin-tour-slugs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tours").select("slug, title").order("title");
      if (error) throw error;
      return data;
    },
  });

  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const edit = (row: Record<string, unknown>) => {
    const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
    setForm({
      id: row['id'] as string,
      slug: (row['slug'] as string) ?? "",
      name: (row['name'] as string) ?? "",
      heading: (row['heading'] as string) ?? "",
      intro: (row['intro'] as string) ?? "",
      image_url: (row['image_url'] as string) ?? null,
      body_sections: arr<Section>(row['body_sections']),
      faqs: arr<Faq>(row['faqs']),
      related_tour_slugs: arr<string>(row['related_tour_slugs']).join(", "),
      published: row['published'] === true,
      sort_order: Number(row['sort_order'] ?? 0),
      last_verified_at: row['last_verified_at']
        ? new Date(row['last_verified_at'] as string).toISOString().slice(0, 10)
        : "",
    });
    setSeo(seoFromRow(row));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setForm(empty);
    setSeo(emptySeo);
  };

  const onImage = async (file: File) => {
    const key = form.slug || slugify(form.name);
    if (!key) {
      toast.error("Add a name first.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaFile("destinations", key, file);
      update("image_url", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      slug: form.slug || slugify(form.name),
      name: form.name,
      heading: form.heading || null,
      intro: form.intro || null,
      image_url: form.image_url,
      body_sections: form.body_sections.filter((s) => s.body.trim()),
      faqs: form.faqs.filter((f) => f.q.trim() && f.a.trim()),
      related_tour_slugs: form.related_tour_slugs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      published: form.published,
      sort_order: Number(form.sort_order) || 0,
      last_verified_at: form.last_verified_at
        ? new Date(form.last_verified_at).toISOString()
        : null,
      ...seoToPayload(seo),
    };
    const res = form.id
      ? await supabase.from("destinations").update(payload).eq("id", form.id).select("id").single()
      : await supabase.from("destinations").insert(payload).select("id").single();
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-destinations"] });
    reset();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this destination page?")) return;
    const { error } = await supabase.from("destinations").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-destinations"] });
    if (form.id === id) reset();
  };

  return (
    <AdminShell requires="content.manage">
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold">Destination pages</h1>
        <p className="text-sm text-muted-foreground mt-1">
          One page per area you drive to — Alfama, Belém, Sintra, Cascais. These are the pages
          people find when they search for a place rather than a tour.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <form onSubmit={save} className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium mb-1 block">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  onBlur={() => !form.slug && update("slug", slugify(form.name))}
                  className={input}
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium mb-1 block">Slug (URL)</span>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => update("slug", slugify(e.target.value))}
                  className={input}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium mb-1 block">Page headline</span>
              <input
                value={form.heading}
                onChange={(e) => update("heading", e.target.value)}
                placeholder={form.name ? `${form.name} by tuk-tuk` : ""}
                className={input}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium mb-1 block">Intro paragraph</span>
              <textarea
                rows={3}
                value={form.intro}
                onChange={(e) => update("intro", e.target.value)}
                className={input}
              />
            </label>

            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block">
                <span className="text-xs font-medium mb-1 block">Order</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => update("sort_order", Number(e.target.value))}
                  className={input}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium mb-1 block">Facts last checked</span>
                <input
                  type="date"
                  value={form.last_verified_at}
                  onChange={(e) => update("last_verified_at", e.target.value)}
                  className={input}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium mb-1 block">
                Tours to show (slugs, comma separated)
              </span>
              <input
                value={form.related_tour_slugs}
                onChange={(e) => update("related_tour_slugs", e.target.value)}
                className={input}
              />
              <span className="text-xs text-muted-foreground mt-1 block">
                Available: {tours.map((t) => t.slug).join(", ") || "—"}
              </span>
            </label>

            <div>
              <p className="text-xs font-medium mb-2">Photo</p>
              {form.image_url && (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-full max-w-sm aspect-[16/10] object-cover rounded-md mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImage(f);
                  e.target.value = "";
                }}
                className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-primary/90"
              />
              {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading…</p>}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Content sections
              </p>
              <button
                type="button"
                onClick={() =>
                  update("body_sections", [...form.body_sections, { heading: "", body: "" }])
                }
                className="text-xs font-semibold text-primary"
              >
                + Add section
              </button>
            </div>
            {form.body_sections.length === 0 && (
              <p className="text-xs text-muted-foreground">No sections yet.</p>
            )}
            {form.body_sections.map((s, i) => (
              <div key={i} className="rounded-md border border-border p-3 space-y-2">
                <input
                  value={s.heading}
                  placeholder="Section heading"
                  onChange={(e) => {
                    const next = [...form.body_sections];
                    next[i] = { ...s, heading: e.target.value };
                    update("body_sections", next);
                  }}
                  className={input}
                />
                <textarea
                  rows={4}
                  value={s.body}
                  placeholder="Write what a guest actually needs to know."
                  onChange={(e) => {
                    const next = [...form.body_sections];
                    next[i] = { ...s, body: e.target.value };
                    update("body_sections", next);
                  }}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() =>
                    update(
                      "body_sections",
                      form.body_sections.filter((_, j) => j !== i),
                    )
                  }
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove section
                </button>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Questions &amp; answers
              </p>
              <button
                type="button"
                onClick={() => update("faqs", [...form.faqs, { q: "", a: "" }])}
                className="text-xs font-semibold text-primary"
              >
                + Add question
              </button>
            </div>
            {form.faqs.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Only add questions you can answer truthfully — these are shown to Google as facts.
              </p>
            )}
            {form.faqs.map((f, i) => (
              <div key={i} className="rounded-md border border-border p-3 space-y-2">
                <input
                  value={f.q}
                  placeholder="Question"
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[i] = { ...f, q: e.target.value };
                    update("faqs", next);
                  }}
                  className={input}
                />
                <textarea
                  rows={3}
                  value={f.a}
                  placeholder="Answer"
                  onChange={(e) => {
                    const next = [...form.faqs];
                    next[i] = { ...f, a: e.target.value };
                    update("faqs", next);
                  }}
                  className={input}
                />
                <button
                  type="button"
                  onClick={() => update("faqs", form.faqs.filter((_, j) => j !== i))}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove question
                </button>
              </div>
            ))}
          </div>

          <SeoFieldsEditor
            value={seo}
            onChange={(patch) => setSeo((prev) => ({ ...prev, ...patch }))}
            previewUrl={`https://tuktuk24lisbon.com/destinations/${form.slug || "your-page"}`}
            fallbackTitle={form.name ? `${form.name} Tuk Tuk Tours | Tuk Tuk 24 Lisbon` : undefined}
            fallbackDescription={form.intro || undefined}
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
              />
              Published
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : form.id ? "Save changes" : "Create page"}
            </button>
            {form.id && (
              <button type="button" onClick={reset} className="text-sm text-muted-foreground">
                Cancel
              </button>
            )}
          </div>
        </form>

        <aside className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            All destinations
          </p>
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">None yet — create your first one.</p>
          )}
          {rows.map((r) => (
            <div
              key={r['id'] as string}
              className="rounded-xl border border-border bg-card p-3 flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold">{r['name'] as string}</p>
                <p className="text-xs text-muted-foreground">/destinations/{r['slug'] as string}</p>
                <p className="text-xs mt-1">
                  {r['published'] ? (
                    <span className="text-emerald-600">Live</span>
                  ) : (
                    <span className="text-muted-foreground">Draft</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button onClick={() => edit(r)} className="text-xs font-semibold text-primary">
                  Edit
                </button>
                <button
                  onClick={() => remove(r['id'] as string)}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </AdminShell>
  );
}
