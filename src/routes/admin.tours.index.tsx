import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tours/")({
  component: AdminToursPage,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price_from: number;
  sale_price: number | null;
  published: boolean;
  featured: boolean;
  image_url: string | null;
  sort_order: number;
};

function AdminToursPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-tours"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("tours")
        .select("id, slug, title, category, price_from, published, featured, image_url, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
  });

  const togglePublish = async (id: string, value: boolean) => {
    const { error } = await supabase.from("tours").update({ published: value }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(value ? "Published" : "Unpublished");
    qc.invalidateQueries({ queryKey: ["admin-tours"] });
    qc.invalidateQueries({ queryKey: ["tours", "public"] });
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("tours").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-tours"] });
    qc.invalidateQueries({ queryKey: ["tours", "public"] });
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Tours</h1>
          <p className="text-sm text-muted-foreground">{data.length} total</p>
        </div>
        <Link
          to="/admin/tours/$id"
          params={{ id: "new" }}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          + New tour
        </Link>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center bg-card">
          <p className="text-sm text-muted-foreground">No tours yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Tour</th>
                <th className="text-left p-3 hidden md:table-cell">Category</th>
                <th className="text-left p-3 hidden sm:table-cell">From</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {t.image_url ? (
                        <img src={t.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-muted" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">/{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 hidden md:table-cell text-muted-foreground">{t.category}</td>
                  <td className="p-3 hidden sm:table-cell">€{t.price_from}</td>
                  <td className="p-3">
                    <button
                      onClick={() => togglePublish(t.id, !t.published)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        t.published
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        to="/admin/tours/$id"
                        params={{ id: t.id }}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => remove(t.id, t.title)}
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
