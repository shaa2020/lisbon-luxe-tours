import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { slugify, uploadMediaFile } from "@/lib/admin-helpers";
import {
  BLOCK_LABELS,
  emptyBlock,
  estimateReadingTime,
  parseBlocks,
  GUIDE_STATUSES,
  type GuideBlock,
  type GuideCategory,
} from "@/lib/travel-guide";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/guide/$id")({
  component: GuideEditorPage,
});

type Faq = { question: string; answer: string };

type Form = {
  slug: string;
  title: string;
  category_id: string;
  excerpt: string;
  quick_answer: string;
  hero_image_url: string;
  hero_image_alt: string;
  hero_image_caption: string;
  author: string;
  reading_time: number;
  status: string;
  featured: boolean;
  featured_order: number;
  locale: string;
  published_at: string;
  seo_title: string;
  meta_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  robots: string;
};

const empty: Form = {
  slug: "",
  title: "",
  category_id: "",
  excerpt: "",
  quick_answer: "",
  hero_image_url: "",
  hero_image_alt: "",
  hero_image_caption: "",
  author: "Tuk Tuk 24",
  reading_time: 5,
  status: "draft",
  featured: false,
  featured_order: 0,
  locale: "en",
  published_at: new Date().toISOString().slice(0, 16),
  seo_title: "",
  meta_description: "",
  canonical_url: "",
  og_title: "",
  og_description: "",
  og_image: "",
  robots: "index,follow",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  );
}

const inputCls =
  "mt-1 w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

function GuideEditorPage() {
  const { id } = Route.useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState<Form>(empty);
  const [blocks, setBlocks] = useState<GuideBlock[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [relatedGuides, setRelatedGuides] = useState<string[]>([]);
  const [relatedTours, setRelatedTours] = useState<string[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-guide-categories"],
    queryFn: async (): Promise<GuideCategory[]> => {
      const { data, error } = await supabase
        .from("travel_categories")
        .select("id, slug, name, description, image_url, seo_title, meta_description, sort_order, active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuideCategory[];
    },
  });

  const { data: tours = [] } = useQuery({
    queryKey: ["admin-guide-tours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, slug, title, published")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: otherGuides = [] } = useQuery({
    queryKey: ["admin-guide-list-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_guides")
        .select("id, title, status")
        .order("title", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { data, error } = await supabase.from("travel_guides").select("*").eq("id", id).single();
      if (error || !data) {
        toast.error(error?.message ?? "Article not found");
        setLoading(false);
        return;
      }
      setForm({
        slug: data.slug,
        title: data.title,
        category_id: data.category_id ?? "",
        excerpt: data.excerpt ?? "",
        quick_answer: data.quick_answer ?? "",
        hero_image_url: data.hero_image_url ?? "",
        hero_image_alt: data.hero_image_alt ?? "",
        hero_image_caption: data.hero_image_caption ?? "",
        author: data.author ?? "Tuk Tuk 24",
        reading_time: data.reading_time ?? 5,
        status: data.status,
        featured: data.featured,
        featured_order: data.featured_order ?? 0,
        locale: data.locale ?? "en",
        published_at: new Date(data.published_at ?? Date.now()).toISOString().slice(0, 16),
        seo_title: data.seo_title ?? "",
        meta_description: data.meta_description ?? "",
        canonical_url: data.canonical_url ?? "",
        og_title: data.og_title ?? "",
        og_description: data.og_description ?? "",
        og_image: data.og_image ?? "",
        robots: data.robots ?? "index,follow",
      });
      setBlocks(parseBlocks(data.content));

      const [f, ra, rt] = await Promise.all([
        supabase
          .from("travel_guide_faqs")
          .select("question, answer, sort_order")
          .eq("guide_id", id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("travel_guide_related_articles")
          .select("related_guide_id, sort_order")
          .eq("guide_id", id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("travel_guide_related_tours")
          .select("tour_id, sort_order")
          .eq("guide_id", id)
          .order("sort_order", { ascending: true }),
      ]);
      setFaqs((f.data ?? []).map((x) => ({ question: x.question, answer: x.answer })));
      setRelatedGuides((ra.data ?? []).map((x) => x.related_guide_id));
      setRelatedTours((rt.data ?? []).map((x) => x.tour_id));
      setLoading(false);
    })();
  }, [id, isNew]);

  const update = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const estimated = useMemo(() => estimateReadingTime(blocks), [blocks]);

  const onHeroUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadMediaFile("guide", form.slug || slugify(form.title) || "guide", file);
      update("hero_image_url", url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onBlockImageUpload = async (index: number, file: File) => {
    setUploading(true);
    try {
      const url = await uploadMediaFile("guide", form.slug || slugify(form.title) || "guide", file);
      setBlocks((bs) =>
        bs.map((b, i) => (i === index && b.type === "image" ? { ...b, url } : b)),
      );
      toast.success("Image uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const patchBlock = (index: number, patch: Record<string, unknown>) =>
    setBlocks((bs) => bs.map((b, i) => (i === index ? ({ ...b, ...patch } as GuideBlock) : b)));

  const moveBlock = (index: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const next = [...bs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return bs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.title.trim()) return toast.error("Add a title first.");
    setSaving(true);
    const slug = form.slug || slugify(form.title);
    const payload = {
      slug,
      title: form.title,
      category_id: form.category_id || null,
      excerpt: form.excerpt,
      quick_answer: form.quick_answer || null,
      content: blocks as unknown,
      hero_image_url: form.hero_image_url || null,
      hero_image_alt: form.hero_image_alt || null,
      hero_image_caption: form.hero_image_caption || null,
      author: form.author,
      reading_time: form.reading_time || estimated,
      status: form.status,
      featured: form.featured,
      featured_order: form.featured_order,
      locale: form.locale,
      published_at:
        form.status === "published" ? new Date(form.published_at).toISOString() : null,
      content_updated_at: new Date().toISOString(),
      seo_title: form.seo_title || null,
      meta_description: form.meta_description || null,
      canonical_url: form.canonical_url || null,
      og_title: form.og_title || null,
      og_description: form.og_description || null,
      og_image: form.og_image || null,
      robots: form.status === "published" ? form.robots : "noindex,nofollow",
    };

    const res = isNew
      ? await supabase
          .from("travel_guides")
          .insert(payload as unknown as never)
          .select("id")
          .single()
      : await supabase
          .from("travel_guides")
          .update(payload as unknown as never)
          .eq("id", id)
          .select("id")
          .single();

    if (res.error || !res.data) {
      setSaving(false);
      return toast.error(res.error?.message ?? "Save failed");
    }
    const guideId = (res.data as { id: string }).id;

    await supabase.from("travel_guide_faqs").delete().eq("guide_id", guideId);
    const cleanFaqs = faqs.filter((f) => f.question.trim() && f.answer.trim());
    if (cleanFaqs.length) {
      await supabase.from("travel_guide_faqs").insert(
        cleanFaqs.map((f, i) => ({
          guide_id: guideId,
          question: f.question,
          answer: f.answer,
          sort_order: i,
        })) as unknown as never,
      );
    }

    await supabase.from("travel_guide_related_articles").delete().eq("guide_id", guideId);
    const relArticles = relatedGuides.filter((g) => g && g !== guideId);
    if (relArticles.length) {
      await supabase.from("travel_guide_related_articles").insert(
        relArticles.map((g, i) => ({
          guide_id: guideId,
          related_guide_id: g,
          sort_order: i,
        })) as unknown as never,
      );
    }

    await supabase.from("travel_guide_related_tours").delete().eq("guide_id", guideId);
    if (relatedTours.length) {
      await supabase.from("travel_guide_related_tours").insert(
        relatedTours.map((t, i) => ({
          guide_id: guideId,
          tour_id: t,
          sort_order: i,
        })) as unknown as never,
      );
    }

    setSaving(false);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-guides"] });
    qc.invalidateQueries({ queryKey: ["guides", "public"] });
    qc.invalidateQueries({ queryKey: ["guide", slug] });
    if (isNew) navigate({ to: "/admin/guide/$id", params: { id: guideId } });
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/guide" className="text-xs text-muted-foreground hover:text-foreground">
          ← All articles
        </Link>
        <div className="flex items-center gap-2">
          {!isNew && form.status === "published" && (
            <a
              href={`/lisbon-guide/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent"
            >
              Preview
            </a>
          )}
          <button
            onClick={() => save()}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <form onSubmit={save} className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          {/* Basics */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">Article</h2>
            <Field label="Title">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                required
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Slug" hint={`/lisbon-guide/${form.slug || slugify(form.title)}`}>
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => update("slug", slugify(e.target.value))}
                  placeholder={slugify(form.title)}
                />
              </Field>
              <Field label="Category">
                <select
                  className={inputCls}
                  value={form.category_id}
                  onChange={(e) => update("category_id", e.target.value)}
                >
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Excerpt" hint={`${form.excerpt.length} characters`}>
              <textarea
                className={inputCls}
                rows={2}
                value={form.excerpt}
                onChange={(e) => update("excerpt", e.target.value)}
              />
            </Field>
            <Field label="Quick answer" hint="Short summary box at the top of the article.">
              <textarea
                className={inputCls}
                rows={2}
                value={form.quick_answer}
                onChange={(e) => update("quick_answer", e.target.value)}
              />
            </Field>
          </section>

          {/* Hero */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">Hero image</h2>
            {form.hero_image_url && (
              <img
                src={form.hero_image_url}
                alt={form.hero_image_alt}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <input
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onHeroUpload(f);
              }}
            />
            {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
            <Field label="Image URL">
              <input
                className={inputCls}
                value={form.hero_image_url}
                onChange={(e) => update("hero_image_url", e.target.value)}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Alt text (required for SEO)">
                <input
                  className={inputCls}
                  value={form.hero_image_alt}
                  onChange={(e) => update("hero_image_alt", e.target.value)}
                />
              </Field>
              <Field label="Caption">
                <input
                  className={inputCls}
                  value={form.hero_image_caption}
                  onChange={(e) => update("hero_image_caption", e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Content blocks */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold">Content</h2>
              <span className="text-xs text-muted-foreground">~{estimated} min read</span>
            </div>

            {blocks.length === 0 && (
              <p className="text-sm text-muted-foreground">No blocks yet — add one below.</p>
            )}

            <div className="space-y-3">
              {blocks.map((b, i) => (
                <div key={i} className="rounded-lg border border-border p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {BLOCK_LABELS[b.type]}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveBlock(i, -1)}
                        className="px-2 py-0.5 text-xs rounded border border-border"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(i, 1)}
                        className="px-2 py-0.5 text-xs rounded border border-border"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlocks((bs) => bs.filter((_, x) => x !== i))}
                        className="px-2 py-0.5 text-xs rounded border border-destructive/30 text-destructive"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {b.type === "heading" && (
                    <div className="flex gap-2">
                      <select
                        className={inputCls + " w-24"}
                        value={b.level}
                        onChange={(e) => patchBlock(i, { level: Number(e.target.value) })}
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                        <option value={4}>H4</option>
                      </select>
                      <input
                        className={inputCls}
                        value={b.text}
                        onChange={(e) => patchBlock(i, { text: e.target.value })}
                        placeholder="Heading text"
                      />
                    </div>
                  )}

                  {b.type === "paragraph" && (
                    <textarea
                      className={inputCls}
                      rows={4}
                      value={b.text}
                      onChange={(e) => patchBlock(i, { text: e.target.value })}
                      placeholder="Paragraph text"
                    />
                  )}

                  {b.type === "list" && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!b.ordered}
                          onChange={(e) => patchBlock(i, { ordered: e.target.checked })}
                        />
                        Numbered list
                      </label>
                      <textarea
                        className={inputCls}
                        rows={4}
                        value={b.items.join("\n")}
                        onChange={(e) => patchBlock(i, { items: e.target.value.split("\n") })}
                        placeholder="One item per line"
                      />
                    </div>
                  )}

                  {b.type === "quote" && (
                    <div className="space-y-2">
                      <textarea
                        className={inputCls}
                        rows={2}
                        value={b.text}
                        onChange={(e) => patchBlock(i, { text: e.target.value })}
                      />
                      <input
                        className={inputCls}
                        value={b.cite ?? ""}
                        onChange={(e) => patchBlock(i, { cite: e.target.value })}
                        placeholder="Attribution (optional)"
                      />
                    </div>
                  )}

                  {b.type === "image" && (
                    <div className="space-y-2">
                      {b.url && <img src={b.url} alt="" className="h-32 rounded object-cover" />}
                      <input
                        type="file"
                        accept="image/*"
                        className="text-sm"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) onBlockImageUpload(i, f);
                        }}
                      />
                      <input
                        className={inputCls}
                        value={b.url}
                        onChange={(e) => patchBlock(i, { url: e.target.value })}
                        placeholder="Image URL"
                      />
                      <input
                        className={inputCls}
                        value={b.alt ?? ""}
                        onChange={(e) => patchBlock(i, { alt: e.target.value })}
                        placeholder="Alt text"
                      />
                      <input
                        className={inputCls}
                        value={b.caption ?? ""}
                        onChange={(e) => patchBlock(i, { caption: e.target.value })}
                        placeholder="Caption"
                      />
                    </div>
                  )}

                  {(b.type === "tip" || b.type === "info" || b.type === "warning") && (
                    <div className="space-y-2">
                      <input
                        className={inputCls}
                        value={b.title ?? ""}
                        onChange={(e) => patchBlock(i, { title: e.target.value })}
                        placeholder="Box title"
                      />
                      <textarea
                        className={inputCls}
                        rows={3}
                        value={b.text}
                        onChange={(e) => patchBlock(i, { text: e.target.value })}
                      />
                    </div>
                  )}

                  {b.type === "table" && (
                    <div className="space-y-2">
                      <input
                        className={inputCls}
                        value={b.headers.join(" | ")}
                        onChange={(e) =>
                          patchBlock(i, { headers: e.target.value.split("|").map((s) => s.trim()) })
                        }
                        placeholder="Header 1 | Header 2"
                      />
                      <textarea
                        className={inputCls}
                        rows={4}
                        value={b.rows.map((r) => r.join(" | ")).join("\n")}
                        onChange={(e) =>
                          patchBlock(i, {
                            rows: e.target.value
                              .split("\n")
                              .map((line) => line.split("|").map((s) => s.trim())),
                          })
                        }
                        placeholder="Cell A | Cell B (one row per line)"
                      />
                    </div>
                  )}

                  {b.type === "cta" && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input
                        className={inputCls}
                        value={b.title}
                        onChange={(e) => patchBlock(i, { title: e.target.value })}
                        placeholder="CTA title"
                      />
                      <input
                        className={inputCls}
                        value={b.text ?? ""}
                        onChange={(e) => patchBlock(i, { text: e.target.value })}
                        placeholder="CTA text"
                      />
                      <input
                        className={inputCls}
                        value={b.label}
                        onChange={(e) => patchBlock(i, { label: e.target.value })}
                        placeholder="Button label"
                      />
                      <input
                        className={inputCls}
                        value={b.href}
                        onChange={(e) => patchBlock(i, { href: e.target.value })}
                        placeholder="/tours"
                      />
                    </div>
                  )}

                  {b.type === "tour" && (
                    <select
                      className={inputCls}
                      value={b.slug}
                      onChange={(e) => patchBlock(i, { slug: e.target.value })}
                    >
                      <option value="">Select a tour…</option>
                      {tours.map((t) => (
                        <option key={t.id} value={t.slug}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  )}

                  {b.type === "divider" && (
                    <p className="text-xs text-muted-foreground">Horizontal rule.</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
              {(Object.keys(BLOCK_LABELS) as GuideBlock["type"][]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setBlocks((bs) => [...bs, emptyBlock(t)])}
                  className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                >
                  + {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-display font-bold">FAQ</h2>
            {faqs.map((f, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2 bg-background">
                <div className="flex justify-end gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setFaqs((xs) => {
                        if (i === 0) return xs;
                        const n = [...xs];
                        [n[i - 1], n[i]] = [n[i], n[i - 1]];
                        return n;
                      })
                    }
                    className="px-2 py-0.5 text-xs rounded border border-border"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFaqs((xs) => {
                        if (i === xs.length - 1) return xs;
                        const n = [...xs];
                        [n[i + 1], n[i]] = [n[i], n[i + 1]];
                        return n;
                      })
                    }
                    className="px-2 py-0.5 text-xs rounded border border-border"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setFaqs((xs) => xs.filter((_, x) => x !== i))}
                    className="px-2 py-0.5 text-xs rounded border border-destructive/30 text-destructive"
                  >
                    Remove
                  </button>
                </div>
                <input
                  className={inputCls}
                  value={f.question}
                  onChange={(e) =>
                    setFaqs((xs) => xs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                  }
                  placeholder="Question"
                />
                <textarea
                  className={inputCls}
                  rows={3}
                  value={f.answer}
                  onChange={(e) =>
                    setFaqs((xs) => xs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                  }
                  placeholder="Answer"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setFaqs((xs) => [...xs, { question: "", answer: "" }])}
              className="px-3 py-1.5 text-xs rounded border border-border hover:bg-accent"
            >
              + Add question
            </button>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">Publishing</h2>
            <Field label="Status">
              <select
                className={inputCls}
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                {GUIDE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Publish date">
              <input
                type="datetime-local"
                className={inputCls}
                value={form.published_at}
                onChange={(e) => update("published_at", e.target.value)}
              />
            </Field>
            <Field label="Author">
              <input
                className={inputCls}
                value={form.author}
                onChange={(e) => update("author", e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Read time (min)">
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.reading_time}
                  onChange={(e) => update("reading_time", Number(e.target.value))}
                />
              </Field>
              <Field label="Featured order">
                <input
                  type="number"
                  className={inputCls}
                  value={form.featured_order}
                  onChange={(e) => update("featured_order", Number(e.target.value))}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
              />
              Featured article
            </label>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">SEO</h2>
            <Field
              label="SEO title"
              hint={`${(form.seo_title || form.title).length}/60 characters`}
            >
              <input
                className={inputCls}
                value={form.seo_title}
                onChange={(e) => update("seo_title", e.target.value)}
                placeholder={form.title}
              />
            </Field>
            <Field
              label="Meta description"
              hint={`${(form.meta_description || form.excerpt).length}/160 characters`}
            >
              <textarea
                className={inputCls}
                rows={3}
                value={form.meta_description}
                onChange={(e) => update("meta_description", e.target.value)}
                placeholder={form.excerpt}
              />
            </Field>
            <Field label="Canonical URL">
              <input
                className={inputCls}
                value={form.canonical_url}
                onChange={(e) => update("canonical_url", e.target.value)}
                placeholder={`https://tuktuk24lisbon.com/lisbon-guide/${form.slug}`}
              />
            </Field>
            <Field label="OG title">
              <input
                className={inputCls}
                value={form.og_title}
                onChange={(e) => update("og_title", e.target.value)}
              />
            </Field>
            <Field label="OG description">
              <textarea
                className={inputCls}
                rows={2}
                value={form.og_description}
                onChange={(e) => update("og_description", e.target.value)}
              />
            </Field>
            <Field label="OG image URL">
              <input
                className={inputCls}
                value={form.og_image}
                onChange={(e) => update("og_image", e.target.value)}
                placeholder={form.hero_image_url}
              />
            </Field>
            <Field label="Robots" hint="Drafts are forced to noindex automatically.">
              <select
                className={inputCls}
                value={form.robots}
                onChange={(e) => update("robots", e.target.value)}
              >
                <option value="index,follow">index,follow</option>
                <option value="noindex,follow">noindex,follow</option>
                <option value="noindex,nofollow">noindex,nofollow</option>
              </select>
            </Field>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-display font-bold">Related tours</h2>
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {tours.map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={relatedTours.includes(t.id)}
                    onChange={(e) =>
                      setRelatedTours((xs) =>
                        e.target.checked ? [...xs, t.id] : xs.filter((x) => x !== t.id),
                      )
                    }
                  />
                  <span className={t.published ? "" : "text-muted-foreground line-through"}>
                    {t.title}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="font-display font-bold">Related articles</h2>
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
              {otherGuides
                .filter((g) => g.id !== id)
                .map((g) => (
                  <label key={g.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={relatedGuides.includes(g.id)}
                      onChange={(e) =>
                        setRelatedGuides((xs) =>
                          e.target.checked ? [...xs, g.id] : xs.filter((x) => x !== g.id),
                        )
                      }
                    />
                    <span className={g.status === "published" ? "" : "text-muted-foreground"}>
                      {g.title}
                    </span>
                  </label>
                ))}
              {otherGuides.length <= 1 && (
                <p className="text-xs text-muted-foreground">No other articles yet.</p>
              )}
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save article"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
