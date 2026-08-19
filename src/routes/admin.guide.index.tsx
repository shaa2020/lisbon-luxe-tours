import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatGuideDate, type GuideCategory } from "@/lib/travel-guide";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/guide/")({
  component: AdminGuideListPage,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  status: string;
  featured: boolean;
  featured_order: number;
  author: string;
  hero_image_url: string | null;
  published_at: string | null;
  updated_at: string;
};

const STATUS_TABS = ["all", "published", "draft", "archived", "trashed"] as const;
type Tab = (typeof STATUS_TABS)[number];

function AdminGuideListPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-guides"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("travel_guides")
        .select(
          "id, slug, title, category_id, status, featured, featured_order, author, hero_image_url, published_at, updated_at",
        )
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

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

  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "all" ? r.status === "trashed" : r.status !== tab) return false;
      if (category !== "all" && r.category_id !== category) return false;
      if (q && !(r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [rows, tab, query, category]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const r of rows) {
      c[r.status] = (c[r.status] ?? 0) + 1;
      if (r.status !== "trashed") c.all += 1;
    }
    return c;
  }, [rows]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-guides"] });
    qc.invalidateQueries({ queryKey: ["guides", "public"] });
  };

  const setStatus = async (id: string, status: string) => {
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("travel_guides").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${status}`);
    refresh();
  };

  const toggleFeatured = async (r: Row) => {
    const { error } = await supabase
      .from("travel_guides")
      .update({ featured: !r.featured })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const duplicate = async (id: string) => {
    const { data, error } = await supabase.from("travel_guides").select("*").eq("id", id).single();
    if (error || !data) return toast.error(error?.message ?? "Not found");
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = data as Record<string, unknown> & {
      id: string;
      created_at: string;
      updated_at: string;
    };
    const copy = {
      ...rest,
      slug: `${rest.slug}-copy-${Date.now().toString().slice(-4)}`,
      title: `${rest.title} (copy)`,
      status: "draft",
      featured: false,
      published_at: null,
    };
    const { error: insErr } = await supabase
      .from("travel_guides")
      .insert(copy as unknown as never);
    if (insErr) return toast.error(insErr.message);
    toast.success("Duplicated");
    refresh();
  };

  const destroy = async (id: string, title: string) => {
    if (!confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("travel_guides").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Travel Guide</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all ?? 0} articles · {counts.published ?? 0} published
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/guide/taxonomy"
            className="px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-accent"
          >
            Categories & redirects
          </Link>
          <Link
            to="/admin/guide/$id"
            params={{ id: "new" }}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
          >
            + New article
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t === "all" ? "All" : t} {counts[t] ? `(${counts[t]})` : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or slug…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card">
          <p className="text-sm text-muted-foreground">No articles here yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Article</th>
                <th className="text-left p-3 hidden md:table-cell">Category</th>
                <th className="text-left p-3 hidden lg:table-cell">Updated</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {r.hero_image_url ? (
                        <img src={r.hero_image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground flex items-center gap-2">
                          {r.title}
                          {r.featured && (
                            <span className="text-[10px] font-bold text-primary">★ Featured</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">/lisbon-guide/{r.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">
                    {catName(r.category_id)}
                  </td>
                  <td className="p-3 hidden lg:table-cell text-muted-foreground text-xs">
                    {formatGuideDate(r.updated_at)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                        r.status === "published"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1">
                      <Link
                        to="/admin/guide/$id"
                        params={{ id: r.id }}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        Edit
                      </Link>
                      {r.status === "published" ? (
                        <>
                          <a
                            href={`/lisbon-guide/${r.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                          >
                            View
                          </a>
                          <button
                            onClick={() => setStatus(r.id, "draft")}
                            className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                          >
                            Unpublish
                          </button>
                        </>
                      ) : r.status !== "trashed" ? (
                        <button
                          onClick={() => setStatus(r.id, "published")}
                          className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                        >
                          Publish
                        </button>
                      ) : null}
                      <button
                        onClick={() => toggleFeatured(r)}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        {r.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        onClick={() => duplicate(r.id)}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        Duplicate
                      </button>
                      {r.status === "trashed" ? (
                        <>
                          <button
                            onClick={() => setStatus(r.id, "draft")}
                            className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => destroy(r.id, r.title)}
                            className="px-2.5 py-1 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setStatus(r.id, "trashed")}
                          className="px-2.5 py-1 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          Trash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
