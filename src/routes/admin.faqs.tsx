import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useSiteBrand } from "@/lib/brand";
import { toast } from "sonner";
import { Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff, Save } from "lucide-react";

export const Route = createFileRoute("/admin/faqs")({
  component: FaqsAdmin,
});

type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
};

function FaqsAdmin() {
  const qc = useQueryClient();
  useSiteBrand();
  const [draft, setDraft] = useState<Record<string, Partial<Faq>>>({});
  const [creating, setCreating] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs" as never)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as Faq[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-faqs"] });

  const merged = (f: Faq): Faq => ({ ...f, ...(draft[f.id] || {}) });
  const isDirty = (id: string) => Object.keys(draft[id] || {}).length > 0;

  const updateField = (id: string, patch: Partial<Faq>) =>
    setDraft((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));

  const save = async (f: Faq) => {
    const m = merged(f);
    const { error } = await supabase
      .from("faqs" as never)
      .update({
        question: m.question.trim(),
        answer: m.answer.trim(),
        sort_order: m.sort_order,
        active: m.active,
      } as never)
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    setDraft((d) => {
      const { [f.id]: _, ...rest } = d;
      return rest;
    });
    toast.success("Saved");
    refresh();
  };

  const toggleActive = async (f: Faq) => {
    const { error } = await supabase
      .from("faqs" as never)
      .update({ active: !f.active } as never)
      .eq("id", f.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const move = async (f: Faq, dir: -1 | 1) => {
    const sorted = [...faqs].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((x) => x.id === f.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase
        .from("faqs" as never)
        .update({ sort_order: swap.sort_order } as never)
        .eq("id", f.id),
      supabase
        .from("faqs" as never)
        .update({ sort_order: f.sort_order } as never)
        .eq("id", swap.id),
    ]);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs" as never).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    refresh();
  };

  const create = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) {
      return toast.error("Question and answer required");
    }
    const maxOrder = faqs.reduce((m, f) => Math.max(m, f.sort_order), 0);
    const { error } = await supabase.from("faqs" as never).insert({
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim(),
      sort_order: maxOrder + 10,
      active: true,
    } as never);
    if (error) return toast.error(error.message);
    toast.success("FAQ added");
    setNewFaq({ question: "", answer: "" });
    setCreating(false);
    refresh();
  };

  return (
    <AdminShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
            Content
          </p>
          <h1 className="text-3xl font-display font-bold">FAQs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit the questions and answers shown on your public FAQ page.
          </p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          New FAQ
        </button>
      </div>

      {creating && (
        <div className="rounded-xl border border-border bg-card p-4 mb-6 space-y-2">
          <input
            value={newFaq.question}
            onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
            placeholder="Question"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
          <textarea
            value={newFaq.answer}
            onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
            placeholder="Answer"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-y"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setCreating(false);
                setNewFaq({ question: "", answer: "" });
              }}
              className="px-3 py-1.5 rounded-md border border-border text-sm"
            >
              Cancel
            </button>
            <button
              onClick={create}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
            >
              Add FAQ
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : faqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {[...faqs]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((f, i, arr) => {
              const m = merged(f);
              return (
                <article
                  key={f.id}
                  className={`rounded-xl border bg-card p-4 ${
                    m.active ? "border-border" : "border-dashed border-border opacity-70"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <input
                      value={m.question}
                      onChange={(e) => updateField(f.id, { question: e.target.value })}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm font-semibold"
                    />
                    <textarea
                      value={m.answer}
                      onChange={(e) => updateField(f.id, { answer: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-y"
                    />
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => move(f, -1)}
                        disabled={i === 0}
                        className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => move(f, 1)}
                        disabled={i === arr.length - 1}
                        className="p-1.5 rounded-md border border-border hover:bg-accent disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(f)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border text-xs hover:bg-accent"
                      >
                        {f.active ? (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hidden
                          </>
                        )}
                      </button>
                      {isDirty(f.id) && (
                        <button
                          onClick={() => save(f)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Save changes
                        </button>
                      )}
                      <button
                        onClick={() => remove(f.id)}
                        className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
        </div>
      )}
    </AdminShell>
  );
}
