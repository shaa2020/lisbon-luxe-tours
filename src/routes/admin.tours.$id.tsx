import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { tourCategories } from "@/lib/cms";
import { slugify, uploadMediaFile } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tours/$id")({
  component: TourEditPage,
});

type TourForm = {
  slug: string;
  title: string;
  category: string;
  category_slug: string;
  duration: string;
  price_from: number;
  image_url: string | null;
  tagline: string;
  description: string;
  highlights: string;
  itinerary: string;
  included: string;
  not_included: string;
  featured: boolean;
  published: boolean;
  sort_order: number;
};

const empty: TourForm = {
  slug: "",
  title: "",
  category: "",
  category_slug: "tuk-tuk",
  duration: "",
  price_from: 0,
  image_url: null,
  tagline: "",
  description: "",
  highlights: "",
  itinerary: "",
  included: "",
  not_included: "",
  featured: false,
  published: true,
  sort_order: 0,
};

function lines(v: string): string[] {
  return v.split("\n").map((l) => l.trim()).filter(Boolean);
}

function parseItinerary(v: string) {
  return lines(v).map((line) => {
    const [time = "", title = "", ...rest] = line.split("|").map((s) => s.trim());
    return { time, title, detail: rest.join(" | ") };
  });
}

function serializeItinerary(items: { time: string; title: string; detail: string }[]) {
  return items.map((i) => `${i.time} | ${i.title} | ${i.detail}`).join("\n");
}

function TourEditPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<TourForm>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("tours").select("*").eq("id", id).single();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      const arr = (v: unknown) => (Array.isArray(v) ? v : []);
      setForm({
        slug: data.slug,
        title: data.title,
        category: data.category,
        category_slug: data.category_slug,
        duration: data.duration,
        price_from: data.price_from,
        image_url: data.image_url,
        tagline: data.tagline ?? "",
        description: data.description ?? "",
        highlights: arr(data.highlights).join("\n"),
        itinerary: serializeItinerary(
          arr(data.itinerary) as { time: string; title: string; detail: string }[],
        ),
        included: arr(data.included).join("\n"),
        not_included: arr(data.not_included).join("\n"),
        featured: data.featured,
        published: data.published,
        sort_order: data.sort_order,
      });
      setLoading(false);
    })();
  }, [id, isNew]);

  const update = <K extends keyof TourForm>(k: K, v: TourForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onImage = async (file: File) => {
    if (!form.slug && !form.title) {
      toast.error("Add a title first so we can name the image.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaFile("tours", form.slug || slugify(form.title), file);
      update("image_url", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onCategoryChange = (slug: string) => {
    const cat = tourCategories.find((c) => c.slug === slug);
    setForm((f) => ({
      ...f,
      category_slug: slug,
      category: cat?.title ?? f.category,
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      slug: form.slug || slugify(form.title),
      title: form.title,
      category: form.category,
      category_slug: form.category_slug,
      duration: form.duration,
      price_from: Number(form.price_from) || 0,
      image_url: form.image_url,
      tagline: form.tagline,
      description: form.description,
      highlights: lines(form.highlights),
      itinerary: parseItinerary(form.itinerary),
      included: lines(form.included),
      not_included: lines(form.not_included),
      featured: form.featured,
      published: form.published,
      sort_order: Number(form.sort_order) || 0,
    };
    const res = isNew
      ? await supabase.from("tours").insert(payload).select("id").single()
      : await supabase.from("tours").update(payload).eq("id", id).select("id").single();
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-tours"] });
    qc.invalidateQueries({ queryKey: ["tours", "public"] });
    qc.invalidateQueries({ queryKey: ["tour", payload.slug] });
    if (isNew) navigate({ to: "/admin/tours/$id", params: { id: res.data.id } });
  };

  if (loading) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <Link
            to="/admin/tours"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← All tours
          </Link>
          <h1 className="text-2xl font-display font-bold mt-1">
            {isNew ? "New tour" : form.title || "Edit tour"}
          </h1>
        </div>
      </div>

      <form onSubmit={save} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              onBlur={() => !form.slug && update("slug", slugify(form.title))}
              className={input}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Slug (URL)">
              <input
                required
                value={form.slug}
                onChange={(e) => update("slug", slugify(e.target.value))}
                className={input}
              />
            </Field>
            <Field label="Category">
              <select
                value={form.category_slug}
                onChange={(e) => onCategoryChange(e.target.value)}
                className={input}
              >
                {tourCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Duration">
              <input
                value={form.duration}
                onChange={(e) => update("duration", e.target.value)}
                placeholder="4 Hours"
                className={input}
              />
            </Field>
            <Field label="Price from (€)">
              <input
                type="number"
                min={0}
                value={form.price_from}
                onChange={(e) => update("price_from", Number(e.target.value))}
                className={input}
              />
            </Field>
            <Field label="Sort order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => update("sort_order", Number(e.target.value))}
                className={input}
              />
            </Field>
          </div>

          <Field label="Tagline">
            <input
              value={form.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              className={input}
            />
          </Field>

          <Field label="Description">
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className={input}
            />
          </Field>

          <Field label="Highlights (one per line)">
            <textarea
              rows={5}
              value={form.highlights}
              onChange={(e) => update("highlights", e.target.value)}
              className={input}
            />
          </Field>

          <Field label="Itinerary (one per line: time | title | detail)">
            <textarea
              rows={6}
              value={form.itinerary}
              onChange={(e) => update("itinerary", e.target.value)}
              placeholder="10:00 | Pickup | Hotel pickup in Lisbon"
              className={`${input} font-mono text-xs`}
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="What's included (one per line)">
              <textarea
                rows={5}
                value={form.included}
                onChange={(e) => update("included", e.target.value)}
                className={input}
              />
            </Field>
            <Field label="Not included (one per line)">
              <textarea
                rows={5}
                value={form.not_included}
                onChange={(e) => update("not_included", e.target.value)}
                className={input}
              />
            </Field>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Publishing
            </p>
            <label className="flex items-center justify-between text-sm">
              <span>Published</span>
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => update("published", e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Featured (Signature)</span>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create tour" : "Save changes"}
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cover image
            </p>
            {form.image_url ? (
              <img
                src={form.image_url}
                alt=""
                className="w-full aspect-[16/10] object-cover rounded-md"
              />
            ) : (
              <div className="w-full aspect-[16/10] rounded-md border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                No image yet
              </div>
            )}
            <label className="block">
              <span className="sr-only">Upload image</span>
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
            </label>
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            {form.image_url && (
              <button
                type="button"
                onClick={() => update("image_url", null)}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Remove image
              </button>
            )}
          </div>
        </aside>
      </form>
    </AdminShell>
  );
}

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
