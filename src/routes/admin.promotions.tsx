import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Eye, Megaphone } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { PromoView } from "@/components/promo/designs";
import {
  EMPTY_PROMOTION,
  PLACEMENT_LABELS,
  PROMO_DESIGNS,
  TARGET_LABELS,
  promotionStatus,
  useAdminPromotions,
  useDeletePromotion,
  usePromotionStats,
  useSavePromotion,
  type DismissRule,
  type PromoPlacement,
  type PromoTarget,
  type Promotion,
} from "@/lib/promotions";

export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
  head: () => ({ meta: [{ title: "Promotions · Admin" }] }),
});

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary";
const label = "text-xs font-medium text-muted-foreground";

type Draft = Omit<Promotion, "created_at" | "updated_at"> & { id?: string };

const NEW_DRAFT = (): Draft => ({ ...(EMPTY_PROMOTION as Draft) });

const toLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

const STATUS_STYLE: Record<string, string> = {
  live: "bg-emerald-100 text-emerald-700",
  scheduled: "bg-amber-100 text-amber-700",
  ended: "bg-muted text-muted-foreground",
  off: "bg-muted text-muted-foreground",
};

function AdminPromotions() {
  const { data: promos = [], isLoading } = useAdminPromotions();
  const { data: stats = {} } = usePromotionStats();
  const save = useSavePromotion();
  const del = useDeletePromotion();
  const [draft, setDraft] = useState<Draft>(NEW_DRAFT());
  const [gallery, setGallery] = useState(false);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const previewPromo = useMemo(
    () => ({ ...draft, id: draft.id ?? "preview", created_at: "", updated_at: "" }) as Promotion,
    [draft],
  );

  const submit = async () => {
    if (!draft.name.trim()) return toast.error("Give the campaign a name");
    if (!draft.headline.trim()) return toast.error("Add a headline");
    try {
      await save.mutateAsync({
        ...draft,
        name: draft.name.trim(),
        code: draft.code?.trim() || null,
        cta_label: draft.cta_label?.trim() || null,
        cta_url: draft.cta_url?.trim() || null,
        target_slug: draft.target === "tour" ? draft.target_slug?.trim() || null : null,
      });
      toast.success(draft.id ? "Campaign updated" : "Campaign created");
      setDraft(NEW_DRAFT());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  };

  const duplicate = (p: Promotion) => {
    const { id, created_at, updated_at, ...rest } = p;
    setDraft({ ...(rest as Draft), name: `${p.name} (copy)`, enabled: false });
    toast.info("Duplicated — review and save");
  };

  const toggle = async (p: Promotion) => {
    await save.mutateAsync({ ...p, enabled: !p.enabled });
  };

  return (
    <AdminShell>
      <div className="space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" /> Promotions
            </h1>
            <p className="text-sm text-muted-foreground">
              Campaign banners, coupons and popups — {PROMO_DESIGNS.length} designs, scheduled and tracked.
            </p>
          </div>
          <button
            onClick={() => setGallery((g) => !g)}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            {gallery ? "Hide design gallery" : "Browse designs"}
          </button>
        </header>

        {gallery && (
          <section className="rounded-xl border border-border bg-card p-4 space-y-6">
            {PROMO_DESIGNS.map((d) => (
              <div key={d.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {d.label} <span className="text-xs text-muted-foreground">· {d.hint}</span>
                  </p>
                  <button
                    onClick={() => {
                      set("design", d.id);
                      setGallery(false);
                    }}
                    className="text-xs font-semibold uppercase tracking-wide text-primary"
                  >
                    Use design
                  </button>
                </div>
                <div className="overflow-hidden rounded-lg border border-border bg-white">
                  <PromoView p={{ ...previewPromo, design: d.id }} preview />
                </div>
              </div>
            ))}
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          {/* Editor */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold">{draft.id ? "Edit campaign" : "New campaign"}</h2>

            <div>
              <p className={label}>Internal name</p>
              <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={label}>Design</p>
                <select className={input} value={draft.design} onChange={(e) => set("design", e.target.value)}>
                  {PROMO_DESIGNS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className={label}>Where it shows</p>
                <select
                  className={input}
                  value={draft.placement}
                  onChange={(e) => set("placement", e.target.value as PromoPlacement)}
                >
                  {Object.entries(PLACEMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={label}>Pages</p>
                <select
                  className={input}
                  value={draft.target}
                  onChange={(e) => set("target", e.target.value as PromoTarget)}
                >
                  {Object.entries(TARGET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {draft.target === "tour" && (
                <div>
                  <p className={label}>Tour slug</p>
                  <input
                    className={input}
                    value={draft.target_slug ?? ""}
                    onChange={(e) => set("target_slug", e.target.value)}
                    placeholder="alfama-sunset"
                  />
                </div>
              )}
            </div>

            <div>
              <p className={label}>Headline</p>
              <input className={input} value={draft.headline} onChange={(e) => set("headline", e.target.value)} />
            </div>
            <div>
              <p className={label}>Subtext</p>
              <textarea
                className={input}
                rows={2}
                value={draft.subtext ?? ""}
                onChange={(e) => set("subtext", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={label}>Promo code (optional)</p>
                <input className={input} value={draft.code ?? ""} onChange={(e) => set("code", e.target.value.toUpperCase())} />
              </div>
              <div>
                <p className={label}>Badge text</p>
                <input className={input} value={draft.badge_text ?? ""} onChange={(e) => set("badge_text", e.target.value)} />
              </div>
              <div>
                <p className={label}>Button label</p>
                <input className={input} value={draft.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
              </div>
              <div>
                <p className={label}>Button link</p>
                <input className={input} value={draft.cta_url ?? ""} onChange={(e) => set("cta_url", e.target.value)} placeholder="/tours" />
              </div>
            </div>

            <div>
              <p className={label}>Image URL (feature / poster designs)</p>
              <input className={input} value={draft.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={label}>Starts</p>
                <input
                  type="datetime-local"
                  className={input}
                  value={toLocal(draft.starts_at)}
                  onChange={(e) => set("starts_at", toIso(e.target.value))}
                />
              </div>
              <div>
                <p className={label}>Ends</p>
                <input
                  type="datetime-local"
                  className={input}
                  value={toLocal(draft.ends_at)}
                  onChange={(e) => set("ends_at", toIso(e.target.value))}
                />
              </div>
              <div>
                <p className={label}>Priority (higher wins)</p>
                <input
                  type="number"
                  className={input}
                  value={draft.priority}
                  onChange={(e) => set("priority", Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <p className={label}>Dismiss rule</p>
                <select
                  className={input}
                  value={draft.dismiss_rule}
                  onChange={(e) => set("dismiss_rule", e.target.value as DismissRule)}
                >
                  <option value="session">Hide for this visit</option>
                  <option value="days">Hide for X days</option>
                  <option value="forever">Hide forever</option>
                  <option value="never">Cannot be dismissed</option>
                </select>
              </div>
              {draft.dismiss_rule === "days" && (
                <div>
                  <p className={label}>Days hidden</p>
                  <input
                    type="number"
                    className={input}
                    value={draft.dismiss_days}
                    onChange={(e) => set("dismiss_days", Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.enabled} onChange={(e) => set("enabled", e.target.checked)} />
              Campaign is live
            </label>

            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                <Plus className="w-4 h-4" /> {draft.id ? "Save changes" : "Create campaign"}
              </button>
              {draft.id && (
                <button onClick={() => setDraft(NEW_DRAFT())} className="rounded-md border border-border px-3 py-2 text-sm">
                  Cancel
                </button>
              )}
            </div>
          </section>

          {/* Preview + list */}
          <div className="space-y-8">
            <section className="rounded-xl border border-border bg-card p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Eye className="w-4 h-4" /> Live preview
              </p>
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <PromoView p={previewPromo} preview />
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-semibold">Campaigns</h2>
              {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {!isLoading && promos.length === 0 && (
                <p className="text-sm text-muted-foreground">No campaigns yet — create your first on the left.</p>
              )}
              {promos.map((p) => {
                const s = promotionStatus(p);
                const st = stats[p.id];
                return (
                  <article key={p.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium flex items-center gap-2">
                          {p.name}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STATUS_STYLE[s]}`}>
                            {s}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {PROMO_DESIGNS.find((d) => d.id === p.design)?.label ?? p.design} ·{" "}
                          {PLACEMENT_LABELS[p.placement]} · {TARGET_LABELS[p.target]}
                        </p>
                        <p className="mt-1 text-sm truncate">{p.headline}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {st ? `${st.impression} views · ${st.cta_click} clicks · ${st.code_copy} code copies` : "No data yet"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => toggle(p)} className="rounded-md border border-border px-3 py-1.5 text-xs">
                          {p.enabled ? "Turn off" : "Turn on"}
                        </button>
                        <button
                          onClick={() => setDraft({ ...(p as Draft) })}
                          className="rounded-md border border-border px-3 py-1.5 text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => duplicate(p)}
                          className="rounded-md border border-border px-2 py-1.5 text-xs"
                          aria-label="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete "${p.name}"?`)) return;
                            await del.mutateAsync(p.id);
                            toast.success("Campaign deleted");
                          }}
                          className="rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
