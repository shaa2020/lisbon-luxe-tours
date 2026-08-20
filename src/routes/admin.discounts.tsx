import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, Tag } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  useDeleteDiscountCode,
  useDiscountCodes,
  useDiscountRedemptions,
  useSaveDiscountCode,
  type DiscountCode,
} from "@/lib/discounts";

export const Route = createFileRoute("/admin/discounts")({
  component: AdminDiscounts,
  head: () => ({ meta: [{ title: "Discount codes · Admin" }] }),
});

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";
const label = "text-xs font-medium text-muted-foreground";

type Draft = {
  id?: string;
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_guests: number;
  max_uses: string;
  expires_at: string;
  active: boolean;
};

const EMPTY: Draft = {
  code: "",
  description: "",
  discount_type: "percent",
  value: 10,
  min_guests: 1,
  max_uses: "",
  expires_at: "",
  active: true,
};

function AdminDiscounts() {
  const { data: codes = [], isLoading } = useDiscountCodes();
  const { data: redemptions = [] } = useDiscountRedemptions();
  const save = useSaveDiscountCode();
  const del = useDeleteDiscountCode();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const edit = (c: DiscountCode) =>
    setDraft({
      id: c.id,
      code: c.code,
      description: c.description ?? "",
      discount_type: c.discount_type,
      value: c.value,
      min_guests: c.min_guests,
      max_uses: c.max_uses == null ? "" : String(c.max_uses),
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : "",
      active: c.active,
    });

  const submit = async () => {
    if (!draft.code.trim()) return toast.error("Enter a code, e.g. WELCOME10");
    if (draft.value <= 0) return toast.error("Discount value must be greater than 0");
    try {
      await save.mutateAsync({
        id: draft.id,
        code: draft.code,
        description: draft.description.trim() || null,
        discount_type: draft.discount_type,
        value: Math.round(draft.value),
        min_guests: Math.max(1, Math.round(draft.min_guests)),
        max_uses: draft.max_uses.trim() ? Math.max(1, Number(draft.max_uses)) : null,
        expires_at: draft.expires_at ? new Date(`${draft.expires_at}T23:59:59Z`).toISOString() : null,
        active: draft.active,
      });
      toast.success(draft.id ? "Code updated" : "Code created");
      setDraft(EMPTY);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discount codes</h1>
          <p className="text-sm text-muted-foreground">
            Create promo codes customers can apply at checkout. Use them in the offer bar, WhatsApp replies and
            follow-up emails.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4" /> {draft.id ? "Edit code" : "New code"}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className={label}>Code</div>
              <input
                className={input}
                placeholder="WELCOME10"
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1">
              <div className={label}>Type</div>
              <select
                className={input}
                value={draft.discount_type}
                onChange={(e) =>
                  setDraft({ ...draft, discount_type: e.target.value as Draft["discount_type"] })
                }
              >
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed € amount off</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className={label}>{draft.discount_type === "percent" ? "Percent (%)" : "Amount (€)"}</div>
              <input
                className={input}
                type="number"
                min={1}
                value={draft.value}
                onChange={(e) => setDraft({ ...draft, value: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <div className={label}>Minimum guests</div>
              <input
                className={input}
                type="number"
                min={1}
                value={draft.min_guests}
                onChange={(e) => setDraft({ ...draft, min_guests: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1">
              <div className={label}>Max uses (blank = unlimited)</div>
              <input
                className={input}
                type="number"
                min={1}
                value={draft.max_uses}
                onChange={(e) => setDraft({ ...draft, max_uses: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <div className={label}>Expires on</div>
              <input
                className={input}
                type="date"
                value={draft.expires_at}
                onChange={(e) => setDraft({ ...draft, expires_at: e.target.value })}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className={label}>Internal note</div>
              <input
                className={input}
                placeholder="Book-direct welcome offer"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <label className="flex items-end gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={save.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {draft.id ? "Save changes" : "Create code"}
            </button>
            {draft.id && (
              <button
                onClick={() => setDraft(EMPTY)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Used</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && codes.length === 0 && (
                <tr>
                  <td className="p-4 text-muted-foreground" colSpan={6}>
                    No codes yet. Create one above.
                  </td>
                </tr>
              )}
              {codes.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-mono font-semibold">{c.code}</td>
                  <td className="p-3">
                    {c.discount_type === "percent" ? `${c.value}%` : `€${c.value}`}
                    {c.min_guests > 1 && (
                      <span className="text-muted-foreground"> · min {c.min_guests} guests</span>
                    )}
                  </td>
                  <td className="p-3">
                    {c.used_count}
                    {c.max_uses ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="p-3">{c.expires_at ? c.expires_at.slice(0, 10) : "—"}</td>
                  <td className="p-3">
                    <span
                      className={
                        c.active
                          ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {c.active ? "Active" : "Off"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => edit(c)} className="mr-3 text-primary underline">
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm(`Delete ${c.code}?`)) return;
                        await del.mutateAsync(c.id);
                        toast.success("Deleted");
                      }}
                      className="text-destructive"
                      aria-label={`Delete ${c.code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Recent redemptions</h2>
          {redemptions.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No codes have been used yet.</p>
          ) : (
            <ul className="mt-3 space-y-1 text-sm">
              {redemptions.map((r) => (
                <li key={r.id} className="flex justify-between border-b border-border/60 py-1">
                  <span className="font-mono">{r.code}</span>
                  <span>−€{(r.amount_cents / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground">{r.created_at.slice(0, 10)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
