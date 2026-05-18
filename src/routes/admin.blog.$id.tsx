import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { slugify, uploadMediaFile } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog/$id")({
  component: BlogEditPage,
});

type Form = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  image_url: string | null;
  content: string; // paragraphs separated by blank lines
  published: boolean;
  published_at: string; // ISO datetime-local value
};

const empty: Form = {
  slug: "",
  title: "",
  excerpt: "",
  category: "Journal",
  read_time: "5 min read",
  image_url: null,
  content: "",
  published: true,
  published_at: new Date().toISOString().slice(0, 16),
};

function toParagraphs(v: string): string[] {
  return v
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function fromParagraphs(arr: unknown): string {
  if (!Array.isArray(arr)) return "";
  return arr.filter((p) => typeof p === "string").join("\n\n");
}

function BlogEditPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      setForm({
        slug: data.slug,
        title: data.title,
        excerpt: data.excerpt ?? "",
        category: data.category,
        read_time: data.read_time,
        image_url: data.image_url,
        content: fromParagraphs(data.content),
        published: data.published,
        published_at: new Date(data.published_at).toISOString().slice(0, 16),
      });
      setLoading(false);
    })();
  }, [id, isNew]);

  const update = <K extends keyof Form>(k: K, v: Form[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onImage = async (file: File) => {
    if (!form.slug && !form.title) {
      toast.error("Add a title first.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadMediaFile("blog", form.slug || slugify(form.title), file);
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
      slug: form.slug || slugify(form.title),
      title: form.title,
      excerpt: form.excerpt,
      category: form.category,
      read_time: form.read_time,
      image_url: form.image_url,
      content: toParagraphs(form.content),
      published: form.published,
      published_at: new Date(form.published_at).toISOString(),
    };
    const res = isNew
      ? await supabase.from("blog_posts").insert(payload).select("id").single()
      : await supabase.from("blog_posts").update(payload).eq("id", id).select("id").single();
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
    qc.invalidateQueries({ queryKey: ["blog", "public"] });
    qc.invalidateQueries({ queryKey: ["post", payload.slug] });
    if (isNew) navigate({ to: "/admin/blog/$id", params: { id: res.data.id } });
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
      <div className="mb-6">
        <Link to="/admin/blog" className="text-xs text-muted-foreground hover:text-foreground">
          ← All posts
        </Link>
        <h1 className="text-2xl font-display font-bold mt-1">
          {isNew ? "New post" : form.title || "Edit post"}
        </h1>
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
              <input
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className={input}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Read time">
              <input
                value={form.read_time}
                onChange={(e) => update("read_time", e.target.value)}
                placeholder="5 min read"
                className={input}
              />
            </Field>
            <Field label="Publish date">
              <input
                type="datetime-local"
                value={form.published_at}
                onChange={(e) => update("published_at", e.target.value)}
                className={input}
              />
            </Field>
          </div>

          <Field label="Excerpt">
            <textarea
              rows={3}
              value={form.excerpt}
              onChange={(e) => update("excerpt", e.target.value)}
              className={input}
            />
          </Field>

          <Field label="Body (separate paragraphs with a blank line)">
            <textarea
              rows={16}
              value={form.content}
              onChange={(e) => update("content", e.target.value)}
              className={`${input} leading-relaxed`}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {toParagraphs(form.content).length} paragraphs · ~
              {form.content.split(/\s+/).filter(Boolean).length} words
            </p>
          </Field>
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
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : isNew ? "Create post" : "Save changes"}
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
