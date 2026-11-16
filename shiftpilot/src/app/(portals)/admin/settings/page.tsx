import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/feedback";
import { AgencySettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Agency settings" };

export default async function AgencySettingsPage() {
  const ctx = await requireStaff("agency.settings.manage");
  const supabase = await createClient();
  const [{ data: agency }, { data: settings }] = await Promise.all([
    supabase.from("agencies").select("name, legal_name, kvk_number, vat_number, slug").eq("id", ctx.agencyId).single(),
    supabase.from("agency_settings").select("*").eq("agency_id", ctx.agencyId).single(),
  ]);
  if (!agency || !settings) throw new Error("Agency settings are unavailable");

  return (
    <>
      <PageHeader title="Agency settings" description="Company details, invoicing defaults, registrations and attendance policy." />
      <AgencySettingsForm agency={agency} settings={settings} />
    </>
  );
}
