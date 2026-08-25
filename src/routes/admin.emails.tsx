import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/admin/emails")({
  component: EmailsAdmin,
});

type Template = {
  id: string;
  key: string;
  label: string;
  subject: string;
  heading: string;
  intro: string;
  outro: string;
  cta_label: string | null;
  cta_url: string | null;
  show_booking_details: boolean;
  sort_order: number;
};

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const lbl = "block text-xs text-muted-foreground mb-1";

function EmailsAdmin() {
  const qc = useQueryClient();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Template>>({});
  const [saving, setSaving] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["admin-email-templates-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("sort_order");
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: log = [] } = useQuery({
    queryKey: ["admin-email-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("id,template_name,recipient_email,status,error_message,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["admin-email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("auto_reminder_enabled,auto_review_request_enabled")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleAuto = async (key: "auto_reminder_enabled" | "auto_review_request_enabled", value: boolean) => {
    const patch =
      key === "auto_reminder_enabled"
        ? { auto_reminder_enabled: value }
        : { auto_review_request_enabled: value };
    const { error } = await supabase.from("site_settings").update(patch).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["admin-email-settings"] });
  };

  const open = (t: Template) => {
    setOpenKey(openKey === t.key ? null : t.key);
    setDraft(t);
  };

  const save = async () => {
    if (!draft.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({
        subject: draft.subject,
        heading: draft.heading,
        intro: draft.intro,
        outro: draft.outro ?? "",
        cta_label: draft.cta_label || null,
        cta_url: draft.cta_url || null,
        show_booking_details: !!draft.show_booking_details,
      })
      .eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    qc.invalidateQueries({ queryKey: ["admin-email-templates-full"] });
    qc.invalidateQueries({ queryKey: ["admin-email-templates"] });
  };

  return (
    <AdminShell>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Customer emails</p>
        <h1 className="text-3xl font-display font-bold">Emails</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit the wording of every email your guests receive, and see what has been sent.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 mb-8">
        <h2 className="font-display text-lg mb-3">Automatic emails</h2>
        <label className="flex items-center gap-3 text-sm mb-2">
          <input
            type="checkbox"
            checked={!!settings?.auto_reminder_enabled}
            onChange={(e) => toggleAuto("auto_reminder_enabled", e.target.checked)}
          />
          Send a tour reminder the day before departure
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={!!settings?.auto_review_request_enabled}
            onChange={(e) => toggleAuto("auto_review_request_enabled", e.target.checked)}
          />
          Ask for a review the day after the tour
        </label>
      </div>

      <h2 className="font-display text-lg mb-3">Templates</h2>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-3 mb-10">
          {templates.map((t) => (
            <div key={t.key} className="rounded-xl border border-border bg-card p-4">
              <button onClick={() => open(t)} className="w-full text-left">
                <p className="font-semibold">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.subject}</p>
              </button>

              {openKey === t.key && (
                <div className="mt-4 grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2"><label className={lbl}>Subject</label><input className={field} value={draft.subject ?? ""} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={lbl}>Heading</label><input className={field} value={draft.heading ?? ""} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={lbl}>Message</label><textarea rows={4} className={field} value={draft.intro ?? ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} /></div>
                  <div className="sm:col-span-2"><label className={lbl}>Closing note</label><textarea rows={2} className={field} value={draft.outro ?? ""} onChange={(e) => setDraft({ ...draft, outro: e.target.value })} /></div>
                  <div><label className={lbl}>Button label</label><input className={field} value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} /></div>
                  <div><label className={lbl}>Button link</label><input className={field} value={draft.cta_url ?? ""} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} /></div>
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!draft.show_booking_details} onChange={(e) => setDraft({ ...draft, show_booking_details: e.target.checked })} />
                    Include the booking details box
                  </label>
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Placeholders: {"{{customer_name}} {{booking_ref}} {{tour}} {{date}} {{guests}} {{total}} {{refund_amount}}"}
                  </p>
                  <div className="sm:col-span-2">
                    <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save template
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <h2 className="font-display text-lg mb-3">Recently sent</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {log.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          log.map((e: any) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <p className="font-medium">{e.recipient_email}</p>
                <p className="text-xs text-muted-foreground">
                  {e.template_name} · {new Date(e.created_at).toLocaleString()}
                  {e.error_message ? ` · ${e.error_message}` : ""}
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider rounded-full border border-border px-2 py-0.5">
                {e.status}
              </span>
            </div>
          ))
        )}
      </div>
    </AdminShell>
  );
}
