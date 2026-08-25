import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { OpsPage } from "@/components/admin/ops/OpsNav";
import { opsSettingsQuery } from "@/lib/ops/queries";
import type { OpsSettings } from "@/lib/ops/types";

export const Route = createFileRoute("/admin/ops/settings")({ component: Page });

const input =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery(opsSettingsQuery);
  const [form, setForm] = useState<Partial<OpsSettings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("ops_settings").upsert({
      id: true,
      business_name: form.business_name ?? "Tuk Tuk 24",
      business_email: form.business_email ?? null,
      business_phone: form.business_phone ?? null,
      currency: form.currency ?? "EUR",
      deposit_percent: Number(form.deposit_percent ?? 20),
      default_duration_hours: Number(form.default_duration_hours ?? 2),
      default_start_time: form.default_start_time ?? "10:00",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["ops", "settings"] });
  };

  const set = (p: Partial<OpsSettings>) => setForm((f) => ({ ...f, ...p }));

  return (
    <AdminShell>
      <OpsPage title="Ops settings" description="Defaults used when creating operations jobs.">
        <div className="rounded-xl border border-border bg-card p-4 grid sm:grid-cols-2 gap-3 max-w-3xl">
          <L label="Business name">
            <input
              className={input}
              value={form.business_name ?? ""}
              onChange={(e) => set({ business_name: e.target.value })}
            />
          </L>
          <L label="Business email">
            <input
              className={input}
              value={form.business_email ?? ""}
              onChange={(e) => set({ business_email: e.target.value })}
            />
          </L>
          <L label="Business phone">
            <input
              className={input}
              value={form.business_phone ?? ""}
              onChange={(e) => set({ business_phone: e.target.value })}
            />
          </L>
          <L label="Currency">
            <input
              className={input}
              value={form.currency ?? "EUR"}
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
            />
          </L>
          <L label="Default deposit %">
            <input
              type="number"
              className={input}
              value={form.deposit_percent ?? 20}
              onChange={(e) => set({ deposit_percent: Number(e.target.value) })}
            />
          </L>
          <L label="Default duration (hours)">
            <input
              type="number"
              className={input}
              value={form.default_duration_hours ?? 2}
              onChange={(e) => set({ default_duration_hours: Number(e.target.value) })}
            />
          </L>
          <L label="Default start time">
            <input
              className={input}
              value={form.default_start_time ?? "10:00"}
              onChange={(e) => set({ default_start_time: e.target.value })}
            />
          </L>
          <div className="sm:col-span-2">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </div>
      </OpsPage>
    </AdminShell>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  );
}
