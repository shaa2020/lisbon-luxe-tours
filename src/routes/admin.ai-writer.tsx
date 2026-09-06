import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import {
  generateBlogDraft,
  saveBlogDraftAsPost,
  listAiGenerationLog,
  listBusinessKnowledge,
  saveBusinessKnowledge,
  deleteBusinessKnowledge,
  type BlogDraft,
} from "@/lib/ai-blog.functions";
import { Sparkles, BookOpen, FileText, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/ai-writer")({
  component: AiWriterPage,
});

type Tab = "writer" | "knowledge" | "history";

type Brief = {
  topic: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  intent: "informational" | "booking";
  audience: string;
  length: "short" | "medium" | "long";
  tone: "friendly" | "professional" | "storytelling";
};

const emptyBrief: Brief = {
  topic: "",
  primaryKeyword: "",
  secondaryKeywords: "",
  intent: "informational",
  audience: "",
  length: "medium",
  tone: "friendly",
};

function parseKeywords(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function AiWriterPage() {
  const [tab, setTab] = useState<Tab>("writer");
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [logId, setLogId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);

  const generate = useServerFn(generateBlogDraft);
  const savePost = useServerFn(saveBlogDraftAsPost);
  const qc = useQueryClient();

  const { data: usage } = useQuery({
    queryKey: ["ai-writer-log"],
    queryFn: useServerFn(listAiGenerationLog),
  });

  const update = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));
  const updateDraft = <K extends keyof BlogDraft>(k: K, v: BlogDraft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const onGenerate = async () => {
    if (brief.topic.trim().length < 5) return toast.error("Describe the topic first.");
    setGenerating(true);
    setSavedPostId(null);
    try {
      const result = await generate({
        data: {
          topic: brief.topic,
          primaryKeyword: brief.primaryKeyword,
          secondaryKeywords: parseKeywords(brief.secondaryKeywords),
          intent: brief.intent,
          audience: brief.audience,
          length: brief.length,
          tone: brief.tone,
        },
      });
      setDraft(result.draft);
      setLogId(result.logId);
      setWordCount(result.wordCount);
      qc.invalidateQueries({ queryKey: ["ai-writer-log"] });
      toast.success("Draft generated — review it below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const onSaveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const { id } = await savePost({
        data: {
          draft,
          primaryKeyword: brief.primaryKeyword,
          secondaryKeywords: parseKeywords(brief.secondaryKeywords),
          logId,
        },
      });
      setSavedPostId(id);
      qc.invalidateQueries({ queryKey: ["ai-writer-log"] });
      toast.success("Saved as unpublished draft.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const input =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <AdminShell requires="content.manage">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-display font-bold">AI Blog Writer</h1>
          <p className="text-sm text-muted-foreground">
            Draft journal articles from your real tours and business facts. Nothing publishes automatically.
          </p>
        </div>
        {usage && (
          <div className="text-xs text-muted-foreground text-right">
            <p>
              Today: <span className="font-semibold text-foreground">{usage.today}</span> / {usage.dailyCap}
            </p>
            <p>
              This month: <span className="font-semibold text-foreground">{usage.month}</span> / {usage.monthlyCap}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mb-6">
        {(
          [
            ["writer", "Write", Sparkles],
            ["knowledge", "Business facts", BookOpen],
            ["history", "History", FileText],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 border transition ${
              tab === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "writer" && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Brief */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit">
            <h2 className="font-display font-semibold">Article brief</h2>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Topic *</label>
              <textarea
                className={`${input} mt-1 min-h-20`}
                placeholder="e.g. Best viewpoints in Lisbon to visit by tuk tuk"
                value={brief.topic}
                onChange={(e) => update("topic", e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Primary keyword</label>
                <input
                  className={`${input} mt-1`}
                  placeholder="tuk tuk tour lisbon"
                  value={brief.primaryKeyword}
                  onChange={(e) => update("primaryKeyword", e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Secondary keywords (comma separated)</label>
                <input
                  className={`${input} mt-1`}
                  placeholder="alfama tour, lisbon viewpoints"
                  value={brief.secondaryKeywords}
                  onChange={(e) => update("secondaryKeywords", e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Intent</label>
                <select className={`${input} mt-1`} value={brief.intent} onChange={(e) => update("intent", e.target.value as Brief["intent"])}>
                  <option value="informational">Inform the reader</option>
                  <option value="booking">Encourage booking</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Audience (optional)</label>
                <input
                  className={`${input} mt-1`}
                  placeholder="first-time visitors, couples…"
                  value={brief.audience}
                  onChange={(e) => update("audience", e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Length</label>
                <select className={`${input} mt-1`} value={brief.length} onChange={(e) => update("length", e.target.value as Brief["length"])}>
                  <option value="short">Short (~600 words)</option>
                  <option value="medium">Medium (~1,200 words)</option>
                  <option value="long">Long (~2,000 words)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tone</label>
                <select className={`${input} mt-1`} value={brief.tone} onChange={(e) => update("tone", e.target.value as Brief["tone"])}>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>
            </div>
            <button
              onClick={onGenerate}
              disabled={generating}
              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? "Writing… this can take a minute" : "Generate draft"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              The writer only uses your published tours, destination pages and the facts in the "Business facts" tab.
            </p>
          </div>

          {/* Draft */}
          <div className="space-y-4">
            {!draft ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Your draft will appear here for review. You can edit every field before saving it as an unpublished journal post.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display font-semibold">Draft — review &amp; edit</h2>
                  <span className="text-xs text-muted-foreground">~{wordCount} words</span>
                </div>

                {draft.verify_flags.length > 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Please verify these claims before publishing
                    </p>
                    {draft.verify_flags.map((f, i) => (
                      <p key={i} className="text-xs text-foreground">
                        <span className="font-medium">{f.claim}</span> — {f.suggestion}
                      </p>
                    ))}
                  </div>
                )}

                <Field label="Title (H1)">
                  <input className={input} value={draft.title} onChange={(e) => updateDraft("title", e.target.value)} />
                </Field>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Slug (URL)">
                    <input className={input} value={draft.slug} onChange={(e) => updateDraft("slug", e.target.value)} />
                  </Field>
                  <Field label="Read time">
                    <input className={input} value={draft.read_time} onChange={(e) => updateDraft("read_time", e.target.value)} />
                  </Field>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="SEO title">
                    <input className={input} value={draft.seo_title} onChange={(e) => updateDraft("seo_title", e.target.value)} />
                  </Field>
                  <Field label="Category">
                    <input className={input} value={draft.category} onChange={(e) => updateDraft("category", e.target.value)} />
                  </Field>
                </div>
                <Field label="Meta description">
                  <textarea className={`${input} min-h-16`} value={draft.meta_description} onChange={(e) => updateDraft("meta_description", e.target.value)} />
                </Field>
                <Field label="Excerpt">
                  <textarea className={`${input} min-h-16`} value={draft.excerpt} onChange={(e) => updateDraft("excerpt", e.target.value)} />
                </Field>
                <Field label={`Article body (${draft.paragraphs.length} paragraphs — blank line between paragraphs)`}>
                  <textarea
                    className={`${input} min-h-64 font-mono text-xs`}
                    value={draft.paragraphs.join("\n\n")}
                    onChange={(e) =>
                      updateDraft(
                        "paragraphs",
                        e.target.value.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
                      )
                    }
                  />
                </Field>
                <Field label={`FAQs (${draft.faqs.length} — appended to the post)`}>
                  <textarea
                    className={`${input} min-h-28 font-mono text-xs`}
                    value={draft.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}
                    onChange={(e) =>
                      updateDraft(
                        "faqs",
                        e.target.value
                          .split(/\n\s*\n/)
                          .map((block) => {
                            const q = block.match(/^Q:\s*(.+)$/m)?.[1]?.trim();
                            const a = block.match(/^A:\s*([\s\S]+)$/m)?.[1]?.trim();
                            return q && a ? { question: q, answer: a } : null;
                          })
                          .filter((f): f is BlogDraft["faqs"][number] => !!f),
                      )
                    }
                  />
                </Field>

                {draft.internal_links.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Suggested internal links (add them in the editor)</p>
                    {draft.internal_links.map((l, i) => (
                      <p key={i} className="text-xs text-foreground">
                        <span className="font-medium">{l.anchor}</span> → {l.path}
                        <span className="text-muted-foreground"> — {l.reason}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Cover image suggestion</p>
                  <p className="text-xs text-foreground">{draft.image_notes}</p>
                </div>

                {savedPostId ? (
                  <Link
                    to="/admin/blog/$id"
                    params={{ id: savedPostId }}
                    className="block text-center w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90"
                  >
                    Open draft in Journal editor →
                  </Link>
                ) : (
                  <button
                    onClick={onSaveDraft}
                    disabled={saving}
                    className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save as unpublished draft"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "knowledge" && <KnowledgeTab />}
      {tab === "history" && <HistoryTab />}
    </AdminShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function KnowledgeTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["business-knowledge"],
    queryFn: useServerFn(listBusinessKnowledge),
  });
  const save = useServerFn(saveBusinessKnowledge);
  const remove = useServerFn(deleteBusinessKnowledge);
  const [label, setLabel] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [busy, setBusy] = useState(false);

  const input =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const add = async () => {
    if (label.trim().length < 2 || content.trim().length < 2)
      return toast.error("Fill in both the label and the fact.");
    setBusy(true);
    try {
      await save({ data: { label, content, category } });
      setLabel("");
      setContent("");
      toast.success("Fact saved.");
      qc.invalidateQueries({ queryKey: ["business-knowledge"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 h-fit">
        <h2 className="font-display font-semibold">Add a verified fact</h2>
        <p className="text-xs text-muted-foreground">
          The AI writer may only use these facts — policies, pickup details, contact info, company story. Keep them accurate.
        </p>
        <Field label="Label (e.g. Cancellation policy)">
          <input className={input} value={label} onChange={(e) => setLabel(e.target.value)} />
        </Field>
        <Field label="Category">
          <input className={input} value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Fact">
          <textarea className={`${input} min-h-24`} value={content} onChange={(e) => setContent(e.target.value)} />
        </Field>
        <button
          onClick={add}
          disabled={busy}
          className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save fact"}
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">No facts yet. Add a few so the writer knows your business.</p>
          </div>
        ) : (
          data.map((k) => (
            <div key={k.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {k.label}
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{k.category}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{k.content}</p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Delete "${k.label}"?`)) return;
                    await remove({ data: { id: k.id } });
                    qc.invalidateQueries({ queryKey: ["business-knowledge"] });
                  }}
                  className="p-1.5 rounded border border-destructive/30 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-writer-log"],
    queryFn: useServerFn(listAiGenerationLog),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.entries.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">No AI drafts generated yet.</p>
      </div>
    );

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="text-left p-3">Topic</th>
            <th className="text-left p-3 hidden sm:table-cell">Keyword</th>
            <th className="text-left p-3 hidden sm:table-cell">Words</th>
            <th className="text-left p-3 hidden md:table-cell">Date</th>
            <th className="text-right p-3">Post</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.map((e) => (
            <tr key={e.id} className="border-t border-border">
              <td className="p-3 text-foreground">{e.topic}</td>
              <td className="p-3 hidden sm:table-cell text-muted-foreground">{e.primary_keyword ?? "—"}</td>
              <td className="p-3 hidden sm:table-cell text-muted-foreground">{e.word_count ?? "—"}</td>
              <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                {new Date(e.created_at).toLocaleString()}
              </td>
              <td className="p-3 text-right">
                {e.post_id ? (
                  <Link
                    to="/admin/blog/$id"
                    params={{ id: e.post_id }}
                    className="px-2.5 py-1 text-xs rounded border border-border hover:bg-accent"
                  >
                    Open post
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">Not saved</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
