import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, X } from "lucide-react";
import { statusTone } from "@/lib/ops/types";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "textarea" | "select" | "boolean" | "tags";
  options?: readonly { value: string; label: string }[] | readonly string[];
  placeholder?: string;
  wide?: boolean;
};

type Row = Record<string, unknown> & { id: string };

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function normOptions(f: FieldDef) {
  return (f.options ?? []).map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
}

function Field({
  f,
  value,
  onChange,
}: {
  f: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (f.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm h-full pt-6">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4"
        />
        {f.label}
      </label>
    );
  }
  return (
    <label className={`block ${f.wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</span>
      {f.type === "textarea" ? (
        <textarea
          rows={3}
          value={String(value ?? "")}
          placeholder={f.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ) : f.type === "select" ? (
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">—</option>
          {normOptions(f).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.type === "tags" ? (
        <input
          value={Array.isArray(value) ? (value as string[]).join(", ") : String(value ?? "")}
          placeholder={f.placeholder ?? "Comma separated"}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          className={inputCls}
        />
      ) : (
        <input
          type={f.type === "number" ? "number" : "text"}
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={f.placeholder ?? ""}
          onChange={(e) =>
            onChange(f.type === "number" ? Number(e.target.value || 0) : e.target.value)
          }
          className={inputCls}
        />
      )}
    </label>
  );
}

export function ResourceManager({
  table,
  queryKey,
  orderBy,
  fields,
  defaults,
  titleKey,
  subtitleKeys = [],
  badgeKey,
  addLabel = "Add",
  emptyLabel = "Nothing here yet.",
}: {
  table: string;
  queryKey: unknown[];
  orderBy: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
  titleKey: string;
  subtitleKeys?: string[];
  badgeKey?: string;
  addLabel?: string;
  emptyLabel?: string;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<Record<string, unknown>>(defaults);
  const [q, setQ] = useState("");

  const { data: rows = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("*")
        .order(orderBy as never);
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey });

  const save = async (id: string) => {
    const { error } = await supabase
      .from(table as never)
      .update(draft as never)
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    setDraft({});
    refresh();
  };

  const create = async () => {
    if (!String(fresh[titleKey] ?? "").trim()) return toast.error("Name is required");
    const { error } = await supabase.from(table as never).insert(fresh as never);
    if (error) return toast.error(error.message);
    toast.success("Added");
    setFresh(defaults);
    setCreating(false);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    const { error } = await supabase.from(table as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const filtered = rows.filter((r) =>
    q.trim()
      ? JSON.stringify(r).toLowerCase().includes(q.trim().toLowerCase())
      : true,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className={`${inputCls} max-w-xs`}
        />
        <button
          type="button"
          onClick={() => setCreating((c) => !c)}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 mb-4">
          <div className="grid sm:grid-cols-2 gap-3">
            {fields.map((f) => (
              <Field
                key={f.key}
                f={f}
                value={fresh[f.key]}
                onChange={(v) => setFresh((s) => ({ ...s, [f.key]: v }))}
              />
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={create}
              className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => {
                setCreating(false);
                setFresh(defaults);
              }}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const open = editing === r.id;
            const badge = badgeKey ? String(r[badgeKey] ?? "") : "";
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="text-left min-w-0"
                    onClick={() => {
                      setEditing(open ? null : r.id);
                      setDraft({});
                    }}
                  >
                    <p className="font-semibold truncate flex items-center gap-2">
                      {String(r[titleKey] ?? "—")}
                      {badge && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            statusTone[badge] ?? "bg-muted text-muted-foreground"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {subtitleKeys
                        .map((k) => {
                          const v = r[k];
                          return Array.isArray(v) ? v.join(", ") : v;
                        })
                        .filter(Boolean)
                        .join(" · ") || "Tap to edit"}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {open && (
                      <button
                        onClick={() => save(r.id)}
                        className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                    )}
                    <button
                      onClick={() => setEditing(open ? null : r.id)}
                      className="w-8 h-8 grid place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent"
                      aria-label={open ? "Close" : "Edit"}
                    >
                      {open ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 rotate-45" />}
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="w-8 h-8 grid place-items-center rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-destructive"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                    {fields.map((f) => (
                      <Field
                        key={f.key}
                        f={f}
                        value={f.key in draft ? draft[f.key] : r[f.key]}
                        onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
