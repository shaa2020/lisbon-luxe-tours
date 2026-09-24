import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, AdminCard } from "@/components/admin/AdminShell";
import { PLACEHOLDERS, type GuestTemplate } from "@/lib/guest-messages";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/guest-messages")({
  head: () => ({ meta: [{ title: "Guest messages · Admin" }, { name: "robots", content: "noindex" }] }),
  component: GuestMessagesPage,
});

const LANGS = [
  { v: "en", l: "English" },
  { v: "pt", l: "Português" },
  { v: "es", l: "Español" },
  { v: "fr", l: "Français" },
];

function GuestMessagesPage() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["guest-templates-all"],
    queryFn: async () =>
      ((await supabase.from("guest_message_templates").select("*").order("sort_order").order("language"))
        .data ?? []) as GuestTemplate[],
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["guest-templates-all"] });
    qc.invalidateQueries({ queryKey: ["guest-templates"] });
  };

  const add = async () => {
    const key = `custom_${Date.now().toString(36)}`;
    const { error } = await supabase.from("guest_message_templates").insert({
      key,
      language: "en",
      label: "New message",
      body: "Hi {guest_name}, ",
      sort_order: rows.length + 1,
    });
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <AdminShell requires="emails.manage">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Guest messages</h1>
          <p className="text-sm text-muted-foreground">
            Ready-written WhatsApp messages you send from any booking with one tap.
          </p>
        </div>
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add message
        </button>
      </div>

      <AdminCard className="mb-5 p-4 text-xs text-muted-foreground">
        Fill-ins you can use:{" "}
        {PLACEHOLDERS.map((p) => (
          <code key={p} className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-foreground">
            {`{${p}}`}
          </code>
        ))}
        <p className="mt-2">
          Add another language by copying a message and changing the language — guests get their own
          language when available, otherwise English.
        </p>
      </AdminCard>

      <div className="space-y-4">
        {rows.map((t) => (
          <TemplateRow key={t.id} t={t} onChange={refresh} />
        ))}
      </div>
    </AdminShell>
  );
}

function TemplateRow({ t, onChange }: { t: GuestTemplate; onChange: () => void }) {
  const [d, setD] = useState(t);
  const [saving, setSaving] = useState(false);
  const dirty = d.label !== t.label || d.body !== t.body || d.language !== t.language || d.active !== t.active;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("guest_message_templates")
      .update({ label: d.label, body: d.body, language: d.language, active: d.active })
      .eq("id", t.id);
    setSaving(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "That language already exists for this message" : error.message);
    toast.success("Saved");
    onChange();
  };
  const copy = async () => {
    const used = new Set([t.language]);
    const next = LANGS.find((l) => !used.has(l.v))?.v ?? "pt";
    const { error } = await supabase.from("guest_message_templates").insert({
      key: t.key, language: next, label: t.label, body: t.body, sort_order: t.sort_order,
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "Change the language of the existing copy first" : error.message);
    onChange();
  };
  const remove = async () => {
    if (!confirm("Delete this message?")) return;
    await supabase.from("guest_message_templates").delete().eq("id", t.id);
    onChange();
  };

  return (
    <AdminCard className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={d.label}
          onChange={(e) => setD({ ...d, label: e.target.value })}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold"
        />
        <select
          value={d.language}
          onChange={(e) => setD({ ...d, language: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {LANGS.map((l) => (
            <option key={l.v} value={l.v}>{l.l}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} />
          On
        </label>
      </div>
      <textarea
        value={d.body}
        onChange={(e) => setD({ ...d, body: e.target.value })}
        rows={3}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!dirty || saving}
          onClick={save}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={copy} className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold">
          Copy for another language
        </button>
        <button onClick={remove} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </AdminCard>
  );
}
