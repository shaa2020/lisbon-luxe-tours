import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock3, Loader2, Mail, Save, ShieldBan } from "lucide-react";
import { getEmailDashboard } from "@/lib/email-admin.functions";

export const Route = createFileRoute("/admin/emails")({
  component: EmailsAdmin,
  head: () => ({ meta: [{ title: "Email Delivery | Tuk Tuk 24 Admin" }] }),
});

type Template = { id: string; key: string; label: string; subject: string; heading: string; intro: string; outro: string; cta_label: string | null; cta_url: string | null; show_booking_details: boolean; sort_order: number };
type Range = "24h" | "7d" | "30d" | "custom";
type DeliveryStatus = "pending" | "sent" | "failed" | "suppressed";
type LogRow = { id: string; message_id: string | null; template_name: string; recipient_email: string; status: string; error_message: string | null; created_at: string };

const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";
const statusOptions: { value: DeliveryStatus; label: string }[] = [
  { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" },
  { value: "suppressed", label: "Suppressed" }, { value: "pending", label: "Queued" },
];

function rangeDates(range: Range, customStart: string, customEnd: string) {
  const end = range === "custom" && customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date();
  const start = range === "custom" && customStart ? new Date(`${customStart}T00:00:00`) : new Date(end);
  if (range !== "custom") start.setHours(start.getHours() - (range === "24h" ? 24 : range === "7d" ? 168 : 720));
  return { start: start.toISOString(), end: end.toISOString() };
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status === "dlq" ? "failed" : status;
  const styles: Record<string, string> = {
    sent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    failed: "border-destructive/30 bg-destructive/10 text-destructive",
    suppressed: "border-amber-500/30 bg-amber-500/10 text-amber-700",
    pending: "border-primary/30 bg-primary/10 text-primary",
  };
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[normalized] ?? "border-border"}`}>{normalized === "pending" ? "queued" : normalized}</span>;
}

function EmailsAdmin() {
  const qc = useQueryClient();
  const fetchDashboard = useServerFn(getEmailDashboard);
  const [range, setRange] = useState<Range>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<DeliveryStatus[]>([]);
  const [page, setPage] = useState(1);
  const [ascending, setAscending] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Template>>({});
  const [saving, setSaving] = useState(false);
  const dates = useMemo(() => rangeDates(range, customStart, customEnd), [range, customStart, customEnd]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["admin-email-templates-full"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("sort_order");
      if (error) throw error;
      return data as Template[];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["admin-email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("auto_reminder_enabled,auto_review_request_enabled").eq("id", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const dashboard = useQuery({
    queryKey: ["admin-email-dashboard", dates.start, dates.end, selectedTemplates, selectedStatuses],
    queryFn: () => fetchDashboard({ data: { ...dates, templates: selectedTemplates, statuses: selectedStatuses } }),
  });

  const rows = [...((dashboard.data?.rows ?? []) as LogRow[])].sort((a, b) =>
    ascending ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / 50));
  const pageRows = rows.slice((page - 1) * 50, page * 50);
  const stats = dashboard.data?.stats ?? { total: 0, sent: 0, failed: 0, suppressed: 0 };

  const toggleAuto = async (key: "auto_reminder_enabled" | "auto_review_request_enabled", value: boolean) => {
    const { error } = await supabase.from("site_settings").update({ [key]: value }).eq("id", true);
    if (error) return toast.error(error.message);
    toast.success("Automation saved");
    qc.invalidateQueries({ queryKey: ["admin-email-settings"] });
  };
  const saveTemplate = async () => {
    if (!draft.id) return;
    setSaving(true);
    const { error } = await supabase.from("email_templates").update({ subject: draft.subject, heading: draft.heading, intro: draft.intro, outro: draft.outro ?? "", cta_label: draft.cta_label || null, cta_url: draft.cta_url || null, show_booking_details: Boolean(draft.show_booking_details) }).eq("id", draft.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Template saved");
    qc.invalidateQueries({ queryKey: ["admin-email-templates-full"] });
  };
  const toggleValue = <T extends string>(value: T, current: T[], setter: (next: T[]) => void) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
    setPage(1);
  };

  return (
    <AdminShell>
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">Customer communications</p>
        <h1 className="text-3xl font-display font-bold">Email delivery</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor delivery, manage automation, and edit the messages guests receive.</p>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="font-display text-lg">Automatic emails</h2><p className="text-xs text-muted-foreground">Messages are queued individually and retried safely.</p></div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settings?.auto_reminder_enabled)} onChange={(e) => toggleAuto("auto_reminder_enabled", e.target.checked)} /> Reminder one day before</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(settings?.auto_review_request_enabled)} onChange={(e) => toggleAuto("auto_review_request_enabled", e.target.checked)} /> Review request one day after</label>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="rounded-lg border border-border bg-card p-4 mb-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["24h", "7d", "30d", "custom"] as Range[]).map((item) => <button key={item} onClick={() => { setRange(item); setPage(1); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${range === item ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item === "24h" ? "Last 24h" : item === "7d" ? "7 days" : item === "30d" ? "30 days" : "Custom"}</button>)}
          </div>
          {range === "custom" && <div className="grid sm:grid-cols-2 gap-3 max-w-lg"><label className="text-xs text-muted-foreground">From<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={`${field} mt-1`} /></label><label className="text-xs text-muted-foreground">To<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={`${field} mt-1`} /></label></div>}
          <div className="grid lg:grid-cols-2 gap-4">
            <div><p className="text-xs font-medium mb-2">Email type</p><div className="flex flex-wrap gap-2"><button onClick={() => { setSelectedTemplates([]); setPage(1); }} className={`rounded-full border px-3 py-1 text-xs ${selectedTemplates.length === 0 ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>All</button>{(dashboard.data?.templateNames ?? []).map((name) => <button key={name} onClick={() => toggleValue(name, selectedTemplates, setSelectedTemplates)} className={`rounded-full border px-3 py-1 text-xs ${selectedTemplates.includes(name) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{name.replaceAll("_", " ")}</button>)}</div></div>
            <div><p className="text-xs font-medium mb-2">Status</p><div className="flex flex-wrap gap-2"><button onClick={() => { setSelectedStatuses([]); setPage(1); }} className={`rounded-full border px-3 py-1 text-xs ${selectedStatuses.length === 0 ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>All</button>{statusOptions.map(({ value, label }) => <button key={value} onClick={() => toggleValue(value, selectedStatuses, setSelectedStatuses)} className={`rounded-full border px-3 py-1 text-xs ${selectedStatuses.includes(value) ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>{label}</button>)}</div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[{ label: "Unique emails", value: stats.total, icon: Mail }, { label: "Sent", value: stats.sent, icon: CheckCircle2 }, { label: "Failed", value: stats.failed, icon: AlertTriangle }, { label: "Suppressed", value: stats.suppressed, icon: ShieldBan }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border bg-card p-4"><Icon className="w-4 h-4 text-primary mb-3" /><p className="text-2xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border"><h2 className="font-display text-lg">Delivery log</h2><button onClick={() => setAscending((value) => !value)} className="inline-flex items-center gap-1 text-xs text-muted-foreground">Timestamp {ascending ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button></div>
          {dashboard.isLoading ? <p className="p-6 text-sm text-muted-foreground"><Loader2 className="inline w-4 h-4 animate-spin mr-2" />Loading delivery data…</p> : pageRows.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No email activity for these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Template</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Timestamp</th><th className="px-4 py-3">Error</th></tr></thead><tbody className="divide-y divide-border">{pageRows.map((row) => <tr key={row.message_id || row.id}><td className="px-4 py-3 font-medium">{row.template_name.replaceAll("_", " ")}</td><td className="px-4 py-3">{row.recipient_email}</td><td className="px-4 py-3"><StatusBadge status={row.status} /></td><td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td><td className="px-4 py-3 max-w-sm text-xs text-destructive">{row.error_message || "—"}</td></tr>)}</tbody></table></div>}
          {pageCount > 1 && <div className="flex items-center justify-between p-4 border-t border-border text-xs"><span>Page {page} of {pageCount}</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} className="rounded-md border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}
        </div>
      </section>

      <section><h2 className="font-display text-lg mb-3">Email templates</h2>{templatesLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <div className="grid gap-3">{templates.map((template) => <div key={template.key} className="rounded-lg border border-border bg-card p-4"><button onClick={() => { setOpenKey(openKey === template.key ? null : template.key); setDraft(template); }} className="w-full text-left"><p className="font-semibold">{template.label}</p><p className="text-xs text-muted-foreground mt-0.5">{template.subject}</p></button>{openKey === template.key && <div className="mt-4 grid sm:grid-cols-2 gap-4"><label className="sm:col-span-2 text-xs text-muted-foreground">Subject<input className={`${field} mt-1`} value={draft.subject ?? ""} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} /></label><label className="sm:col-span-2 text-xs text-muted-foreground">Heading<input className={`${field} mt-1`} value={draft.heading ?? ""} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} /></label><label className="sm:col-span-2 text-xs text-muted-foreground">Message<textarea rows={4} className={`${field} mt-1`} value={draft.intro ?? ""} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} /></label><label className="sm:col-span-2 text-xs text-muted-foreground">Closing note<textarea rows={2} className={`${field} mt-1`} value={draft.outro ?? ""} onChange={(e) => setDraft({ ...draft, outro: e.target.value })} /></label><label className="text-xs text-muted-foreground">Button label<input className={`${field} mt-1`} value={draft.cta_label ?? ""} onChange={(e) => setDraft({ ...draft, cta_label: e.target.value })} /></label><label className="text-xs text-muted-foreground">Button link<input className={`${field} mt-1`} value={draft.cta_url ?? ""} onChange={(e) => setDraft({ ...draft, cta_url: e.target.value })} /></label><label className="sm:col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.show_booking_details)} onChange={(e) => setDraft({ ...draft, show_booking_details: e.target.checked })} /> Include booking details</label><p className="sm:col-span-2 text-xs text-muted-foreground">Placeholders: {"{{customer_name}} {{booking_ref}} {{tour}} {{date}} {{time}} {{guests}} {{total}} {{refund_amount}}"}</p><div className="sm:col-span-2"><button onClick={saveTemplate} disabled={saving} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save template</button></div></div>}</div>)}</div>}</section>
    </AdminShell>
  );
}