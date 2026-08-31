import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AdminShell, AdminPageHeader, AdminCard } from "@/components/admin/AdminShell";
import {
  API_SCOPE_LIST,
  createApiKey,
  listApiKeys,
  listApiRequestLogs,
  revokeApiKey,
  rotateApiKey,
  setApiKeyActive,
  type ApiKeyRow,
} from "@/lib/api-keys.functions";

export const Route = createFileRoute("/admin/api")({
  head: () => ({ meta: [{ title: "API keys — Admin" }] }),
  component: () => (
    <AdminShell requires="api.manage">
      <ApiBody />
    </AdminShell>
  ),
});

const DEFAULT_SCOPES = ["READ_TOURS", "READ_AVAILABILITY", "READ_BUSINESS", "CREATE_LEAD"];

function fmt(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function ApiBody() {
  const qc = useQueryClient();
  const fetchKeys = useServerFn(listApiKeys);
  const fetchLogs = useServerFn(listApiRequestLogs);
  const create = useServerFn(createApiKey);
  const rotate = useServerFn(rotateApiKey);
  const toggle = useServerFn(setApiKeyActive);
  const remove = useServerFn(revokeApiKey);

  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => fetchKeys({}) });
  const logs = useQuery({ queryKey: ["api-logs"], queryFn: () => fetchLogs({}) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["api-keys"] });
    qc.invalidateQueries({ queryKey: ["api-logs"] });
  };

  const createM = useMutation({
    mutationFn: () => create({ data: { name, scopes: scopes as never } }),
    onSuccess: (res) => {
      setFreshToken(res.token);
      setName("");
      refresh();
      toast.success("API key created — copy it now, it is shown only once");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotateM = useMutation({
    mutationFn: (id: string) => rotate({ data: { id } }),
    onSuccess: (res) => {
      setFreshToken(res.token);
      refresh();
      toast.success("Key rotated — the old key stopped working");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleM = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => {
      refresh();
      toast.success("Updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      refresh();
      toast.success("Key deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <>
      <AdminPageHeader
        eyebrow="Integrations"
        title="API keys"
        description="Server-to-server access for WhatsApp automations, n8n workflows and AI agents."
      />

      {freshToken && (
        <AdminCard className="mb-6 border-primary/40">
          <div className="p-5">
            <p className="text-sm font-semibold mb-1">Your new secret key</p>
            <p className="text-xs text-muted-foreground mb-3">
              Copy it now. For security it is hashed in the database and can never be shown again.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-lg bg-muted px-3 py-2 text-xs">{freshToken}</code>
              <button
                onClick={() => copy(freshToken)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </button>
              <button onClick={() => setFreshToken(null)} className="text-xs text-muted-foreground underline">
                Hide
              </button>
            </div>
          </div>
        </AdminCard>
      )}

      <AdminCard className="mb-6">
        <div className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4" /> Generate a key
          </h3>
          <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Key name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="n8n WhatsApp agent"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Permissions</label>
              <div className="flex flex-wrap gap-2">
                {API_SCOPE_LIST.map((scope) => {
                  const on = scopes.includes(scope);
                  return (
                    <button
                      key={scope}
                      type="button"
                      onClick={() =>
                        setScopes((prev) => (on ? prev.filter((s) => s !== scope) : [...prev, scope]))
                      }
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {scope}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <button
            disabled={!name.trim() || scopes.length === 0 || createM.isPending}
            onClick={() => createM.mutate()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <KeyRound className="h-4 w-4" /> {createM.isPending ? "Generating…" : "Generate key"}
          </button>
        </div>
      </AdminCard>

      <AdminCard className="mb-6">
        <div className="p-5">
          <h3 className="mb-4 text-sm font-semibold">Existing keys</h3>
          {keys.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (keys.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <div className="space-y-3">
              {(keys.data as ApiKeyRow[]).map((k) => (
                <div key={k.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        {k.name}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            k.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {k.active ? "Active" : "Disabled"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        <code>{k.key_prefix}_••••••</code> · created {fmt(k.created_at)} · last used{" "}
                        {fmt(k.last_used_at)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span key={s} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => toggleM.mutate({ id: k.id, active: !k.active })}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
                      >
                        {k.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        onClick={() => rotateM.mutate(k.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Rotate
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete “${k.name}”? Any integration using it will stop working.`))
                            removeM.mutate(k.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-medium text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Recent API activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Key</th>
                  <th className="py-2 pr-3">Request</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-border/60">
                    <td className="py-2 pr-3 whitespace-nowrap">{fmt(l.created_at)}</td>
                    <td className="py-2 pr-3">{l.key_prefix ?? "—"}</td>
                    <td className="py-2 pr-3 break-all">
                      {l.method} {l.path}
                    </td>
                    <td className={`py-2 pr-3 ${l.status >= 400 ? "text-destructive" : "text-emerald-600"}`}>
                      {l.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(logs.data ?? []).length === 0 && (
              <p className="py-3 text-sm text-muted-foreground">No API calls recorded yet.</p>
            )}
          </div>
        </div>
      </AdminCard>
    </>
  );
}
