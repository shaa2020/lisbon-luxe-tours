import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, X, ArrowUp, ArrowDown, Trash2, Plus, Wand2 } from "lucide-react";
import { tourCategories } from "@/lib/cms";
import { generateTourDraft, reviseTourDraft, type AiTourDraft } from "@/lib/ai-tour.functions";

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

const PLACEHOLDER = `Alfama tour 1h

1. Cathedral (se de lisboa)
2. Santa luzia viewpoint
3. portas do sol viewpoint
4. senhora do monte viewpoint
5. monastery of sao vicente de fora
6. national pantheon
7. Alfama main part

Senhora do Monte is a mandatory stop`;

export function AiTourBuilder({
  onImport,
  onClose,
}: {
  onImport: (draft: AiTourDraft) => void;
  onClose: () => void;
}) {
  const generate = useServerFn(generateTourDraft);
  const revise = useServerFn(reviseTourDraft);

  const [notes, setNotes] = useState("");
  const [durationHint, setDurationHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [draft, setDraft] = useState<AiTourDraft | null>(null);

  const run = async () => {
    if (notes.trim().length < 5) {
      toast.error("Paste your itinerary notes first.");
      return;
    }
    setBusy(true);
    try {
      const result = await generate({
        data: { notes, ...(durationHint.trim() ? { durationHint } : {}) },
      });
      setDraft(result);
      toast.success("Tour generated — review it below.");
    } catch (e) {
      toast.error((e as Error).message || "Generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const applyInstruction = async () => {
    if (!draft || instruction.trim().length < 2) return;
    setBusy(true);
    try {
      const result = await revise({ data: { draft, instruction } });
      setDraft(result);
      setInstruction("");
      toast.success("Updated.");
    } catch (e) {
      toast.error((e as Error).message || "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const patch = (p: Partial<AiTourDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const moveHighlight = (i: number, dir: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.highlights];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    patch({ highlights: next });
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 sm:p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 grid place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="font-display font-bold text-lg leading-tight">AI Tour Builder</h2>
            <p className="text-xs text-muted-foreground">
              Paste rough notes — the AI fills the tour form. Prices are never generated.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 grid place-items-center rounded-full hover:bg-accent"
          aria-label="Close AI Tour Builder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="block mb-3">
        <span className="text-xs font-medium text-muted-foreground mb-1 block">
          Paste your itinerary
        </span>
        <textarea
          rows={8}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={PLACEHOLDER}
          className={`${input} font-mono text-xs`}
        />
      </label>

      <div className="flex flex-wrap items-end gap-3 mb-1">
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground mb-1 block">
            Duration (optional)
          </span>
          <input
            value={durationHint}
            onChange={(e) => setDurationHint(e.target.value)}
            placeholder="1 Hour"
            className={`${input} w-40`}
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={run}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {busy ? "Working…" : draft ? "Regenerate" : "Generate Tour"}
        </button>
        {draft && (
          <button
            type="button"
            onClick={() => onImport(draft)}
            className="rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Import into Tour
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent"
        >
          Cancel
        </button>
      </div>

      {draft && (
        <div className="mt-5 space-y-4 border-t border-border pt-5">
          <div className="rounded-lg border border-border bg-card p-3">
            <span className="text-xs font-medium text-muted-foreground mb-1 block">
              Tell AI what to change
            </span>
            <div className="flex gap-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void applyInstruction();
                  }
                }}
                placeholder="Make the itinerary fit exactly 90 minutes"
                className={input}
              />
              <button
                type="button"
                disabled={busy}
                onClick={applyInstruction}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
              >
                <Wand2 className="w-4 h-4" /> Apply
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Small label="Title">
              <input
                value={draft.title}
                onChange={(e) => patch({ title: e.target.value })}
                className={input}
              />
            </Small>
            <Small label="Slug">
              <input
                value={draft.slug}
                onChange={(e) => patch({ slug: e.target.value })}
                className={input}
              />
            </Small>
            <Small label="Category">
              <select
                value={draft.category_slug}
                onChange={(e) => patch({ category_slug: e.target.value })}
                className={input}
              >
                {tourCategories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Small>
            <Small label="Duration">
              <input
                value={draft.duration}
                onChange={(e) => patch({ duration: e.target.value })}
                className={input}
              />
            </Small>
          </div>

          <Small label="Tagline">
            <input
              value={draft.tagline}
              onChange={(e) => patch({ tagline: e.target.value })}
              className={input}
            />
          </Small>

          <Small label="Description">
            <textarea
              rows={5}
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
              className={input}
            />
          </Small>

          <div>
            <span className="text-xs font-medium text-muted-foreground mb-1 block">
              Highlights
            </span>
            <div className="space-y-1.5">
              {draft.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    value={h}
                    onChange={(e) => {
                      const next = [...draft.highlights];
                      next[i] = e.target.value;
                      patch({ highlights: next });
                    }}
                    className={input}
                  />
                  <IconBtn label="Move up" onClick={() => moveHighlight(i, -1)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </IconBtn>
                  <IconBtn label="Move down" onClick={() => moveHighlight(i, 1)}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Delete"
                    onClick={() =>
                      patch({ highlights: draft.highlights.filter((_, x) => x !== i) })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconBtn>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => patch({ highlights: [...draft.highlights, ""] })}
              className="mt-2 text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3.5 h-3.5" /> Add highlight
            </button>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground mb-1 block">
              Itinerary
            </span>
            <div className="space-y-1.5">
              {draft.itinerary.map((it, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-card p-2 grid gap-1.5 sm:grid-cols-[80px_1fr_2fr_auto] items-center"
                >
                  <input
                    value={it.time}
                    onChange={(e) => {
                      const next = [...draft.itinerary];
                      next[i] = { ...it, time: e.target.value };
                      patch({ itinerary: next });
                    }}
                    className={`${input} font-mono text-xs`}
                  />
                  <input
                    value={it.title}
                    onChange={(e) => {
                      const next = [...draft.itinerary];
                      next[i] = { ...it, title: e.target.value };
                      patch({ itinerary: next });
                    }}
                    className={input}
                  />
                  <input
                    value={it.detail}
                    onChange={(e) => {
                      const next = [...draft.itinerary];
                      next[i] = { ...it, detail: e.target.value };
                      patch({ itinerary: next });
                    }}
                    className={input}
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = [...draft.itinerary];
                        next[i] = { ...it, mandatory: !it.mandatory };
                        patch({ itinerary: next });
                      }}
                      className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap ${
                        it.mandatory
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {it.mandatory ? "MANDATORY STOP" : "OPTIONAL"}
                    </button>
                    <IconBtn
                      label="Delete stop"
                      onClick={() =>
                        patch({ itinerary: draft.itinerary.filter((_, x) => x !== i) })
                      }
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Small label="What's included (one per line)">
              <textarea
                rows={4}
                value={draft.included.join("\n")}
                onChange={(e) => patch({ included: e.target.value.split("\n") })}
                className={input}
              />
            </Small>
            <Small label="Not included (one per line)">
              <textarea
                rows={4}
                value={draft.not_included.join("\n")}
                onChange={(e) => patch({ not_included: e.target.value.split("\n") })}
                className={input}
              />
            </Small>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => onImport(draft)}
              className="rounded-md bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90"
            >
              Import into Tour
            </button>
            <p className="text-xs text-muted-foreground self-center">
              Then set the price and use the existing Save / Publish controls.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Small({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="w-8 h-8 shrink-0 grid place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent"
    >
      {children}
    </button>
  );
}
