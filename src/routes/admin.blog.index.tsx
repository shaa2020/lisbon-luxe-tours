import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog/")({
  component: AdminBlogPage,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  published: boolean;
  image_url: string | null;
  published_at: string;
};

function AdminBlogPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, category, published, image_url, published_at")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
  });

  const togglePublish = async (id: string, value: boolean) => {
    const { error } = await supabase.from("blog_posts").update({ published: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Published" : "Unpublished");
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
    qc.invalidateQueries({ queryKey: ["blog", "public"] });
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-blog"] });
    qc.invalidateQueries({ queryKey: ["blog", "public"] });
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Journal</h1>
          <p className="text-sm text-muted-foreground">{data.length} stories</p>
        </div>
        <Link
          to="/admin/blog/$id"
          params={{ id: "new" }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          + New post
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card">
          <p className="text-sm text-muted-foreground">No posts yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Post</th>
                <th className="text-left p-3 hidden md:table-cell">Category</th>
                <th className="text-left p-3 hidden sm:table-cell">Date</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{p.category}</td>
                  <td className="p-3 hidden sm:table-cell text-muted-foreground text-xs">
                    {new Date(p.published_at).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => togglePublish(p.id, !p.published)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        p.published
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        to="/admin/blog/$id"
                        params={{ id: p.id }}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => remove(p.id, p.title)}
                        className="px-2.5 py-1 text-xs rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        Delete
                      </button>
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
