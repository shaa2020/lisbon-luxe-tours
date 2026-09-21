import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { History, Search, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/audit-log")({
  component: AuditLogAdmin,
  head: () => ({
    meta: [{ title: "Activity log · Tuk Tuk 24 admin" }, { name: "robots", content: "noindex" }],
  }),
});

type LogRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  summary: string | null;
};

const PAGE = 100;

function label(v: string) {
  return v.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function AuditLogAdmin() {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState("all");
  const [page, setPage] = useState(0);

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-audit-log", page],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log" as never)
        .select("id,created_at,actor_email,entity,entity_id,action,summary")
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) throw error;
      return data as unknown as LogRow[];
    },
  });

  const entities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (entity !== "all" && r.entity !== entity) return false;
      if (!needle) return true;
      return [r.actor_email, r.entity, r.action, r.summary, r.entity_id]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, entity]);

  return (
    <AdminShell requires="settings.manage">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search person, booking, action…"
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All areas</option>
            {entities.map((e) => (
              <option key={e} value={e}>
                {label(e)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <History className="mx-auto mb-3 h-6 w-6 opacity-50" />
              Nothing recorded yet.
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {r.summary || `${label(r.action)} · ${label(r.entity)}`}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.actor_email || "System"} · {label(r.entity)} · {label(r.action)}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Newer
          </button>
          <span className="text-muted-foreground">Page {page + 1}</span>
          <button
            type="button"
            disabled={rows.length < PAGE}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-2 disabled:opacity-40"
          >
            Older
          </button>
        </div>
      </div>
    </AdminShell>
  );
}
