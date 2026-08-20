import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { slugify } from "@/lib/admin-helpers";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/guide/taxonomy")({
  component: GuideTaxonomyPage,
});

const inputCls =
  "px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  meta_description: string | null;
  sort_order: number;
  active: boolean;
};

type Tag = { id: string; slug: string; name: string };
type Redirect = { id: string; from_path: string; to_path: string; redirect_type: number };

function GuideTaxonomyPage() {
  const qc = useQueryClient();
  const [newCat, setNewCat] = useState("");
  const [newTag, setNewTag] = useState("");
  const [redirFrom, setRedirFrom] = useState("");
  const [redirTo, setRedirTo] = useState("");

  const categories = useQuery({
    queryKey: ["admin-guide-categories-all"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("travel_categories")
        .select(
          "id, slug, name, description, image_url, seo_title, meta_description, sort_order, active",
        )
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const tags = useQuery({
    queryKey: ["admin-guide-tags"],
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from("travel_tags")
        .select("id, slug, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Tag[];
    },
  });

  const redirects = useQuery({
    queryKey: ["admin-guide-redirects"],
    queryFn: async (): Promise<Redirect[]> => {
      const { data, error } = await supabase
        .from("travel_guide_redirects")
        .select("id, from_path, to_path, redirect_type")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Redirect[];
    },
  });

  const addCategory = async () => {
    if (!newCat.trim()) return;
    const { error } = await supabase.from("travel_categories").insert({
      name: newCat.trim(),
      slug: slugify(newCat),
      sort_order: (categories.data?.length ?? 0) + 1,
    } as unknown as never);
    if (error) return toast.error(error.message);
    setNewCat("");
    toast.success("Category added");
    qc.invalidateQueries({ queryKey: ["admin-guide-categories-all"] });
    qc.invalidateQueries({ queryKey: ["guide-categories"] });
  };

  const patchCategory = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase
      .from("travel_categories")
      .update(patch as unknown as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-guide-categories-all"] });
    qc.invalidateQueries({ queryKey: ["guide-categories"] });
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Articles will keep their content but lose the category."))
      return;
    const { error } = await supabase.from("travel_categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Category deleted");
    qc.invalidateQueries({ queryKey: ["admin-guide-categories-all"] });
  };

  const addTag = async () => {
    if (!newTag.trim()) return;
    const { error } = await supabase
      .from("travel_tags")
      .insert({ name: newTag.trim(), slug: slugify(newTag) } as unknown as never);
    if (error) return toast.error(error.message);
    setNewTag("");
    qc.invalidateQueries({ queryKey: ["admin-guide-tags"] });
  };

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from("travel_tags").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-guide-tags"] });
  };

  const addRedirect = async () => {
    if (!redirFrom.trim() || !redirTo.trim()) return;
    const { error } = await supabase.from("travel_guide_redirects").insert({
      from_path: redirFrom.trim(),
      to_path: redirTo.trim(),
      redirect_type: 301,
    } as unknown as never);
    if (error) return toast.error(error.message);
    setRedirFrom("");
    setRedirTo("");
    toast.success("Redirect added");
    qc.invalidateQueries({ queryKey: ["admin-guide-redirects"] });
  };

  const deleteRedirect = async (id: string) => {
    const { error } = await supabase.from("travel_guide_redirects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-guide-redirects"] });
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <Link to="/admin/guide" className="text-xs text-muted-foreground hover:text-foreground">
          ← All articles
        </Link>
        <h1 className="text-2xl font-display font-bold mt-1">Categories, tags & redirects</h1>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Categories */}
        <section className="rounded-xl border border-border bg-card p-4 space-y-4">
          <h2 className="font-display font-bold">Categories</h2>
          <div className="flex gap-2">
            <input
              className={inputCls + " flex-1"}
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              placeholder="New category name"
            />
            <button
              onClick={addCategory}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            >
              Add
            </button>
          </div>
          <div className="space-y-3">
            {(categories.data ?? []).map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls + " flex-1"}
                    defaultValue={c.name}
                    onBlur={(e) =>
                      e.target.value !== c.name && patchCategory(c.id, { name: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className={inputCls + " w-20"}
                    defaultValue={c.sort_order}
                    onBlur={(e) => patchCategory(c.id, { sort_order: Number(e.target.value) })}
                  />
                </div>
                <input
                  className={inputCls + " w-full"}
                  defaultValue={c.slug}
                  onBlur={(e) =>
                    e.target.value !== c.slug &&
                    patchCategory(c.id, { slug: slugify(e.target.value) })
                  }
                  placeholder="slug"
                />
                <textarea
                  className={inputCls + " w-full"}
                  rows={2}
                  defaultValue={c.description ?? ""}
                  onBlur={(e) => patchCategory(c.id, { description: e.target.value })}
                  placeholder="Description"
                />
                <input
                  className={inputCls + " w-full"}
                  defaultValue={c.meta_description ?? ""}
                  onBlur={(e) => patchCategory(c.id, { meta_description: e.target.value })}
                  placeholder="Meta description"
                />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={c.active}
                      onChange={(e) => patchCategory(c.id, { active: e.target.checked })}
                    />
                    Active
                  </label>
                  <button
                    onClick={() => deleteCategory(c.id)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {categories.data?.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories yet.</p>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Tags */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">Tags</h2>
            <div className="flex gap-2">
              <input
                className={inputCls + " flex-1"}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(tags.data ?? []).map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-border text-xs"
                >
                  {t.name}
                  <button onClick={() => deleteTag(t.id)} className="text-destructive">
                    ×
                  </button>
                </span>
              ))}
              {tags.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags yet.</p>
              )}
            </div>
          </section>

          {/* Redirects */}
          <section className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h2 className="font-display font-bold">Redirects</h2>
            <p className="text-xs text-muted-foreground">
              Slug changes create 301 redirects automatically. Add extras here.
            </p>
            <div className="grid gap-2">
              <input
                className={inputCls}
                value={redirFrom}
                onChange={(e) => setRedirFrom(e.target.value)}
                placeholder="/lisbon-guide/old-slug"
              />
              <input
                className={inputCls}
                value={redirTo}
                onChange={(e) => setRedirTo(e.target.value)}
                placeholder="/lisbon-guide/new-slug"
              />
              <button
                onClick={addRedirect}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
              >
                Add redirect
              </button>
            </div>
            <div className="space-y-2">
              {(redirects.data ?? []).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-2 text-xs border border-border rounded-md px-3 py-2"
                >
                  <span className="truncate">
                    {r.from_path} → {r.to_path}
                  </span>
                  <button
                    onClick={() => deleteRedirect(r.id)}
                    className="text-destructive shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
              {redirects.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">No redirects yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
