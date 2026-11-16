"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { agencySettingsSchema } from "@/lib/validation/agency";
import { fieldErrors } from "@/lib/validation/auth";
import type { FormState } from "@/app/(auth)/actions";

export async function updateAgencySettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await requireStaff("agency.settings.manage");
  const parsed = agencySettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Please correct the highlighted fields." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase.from("agency_settings").select("wtta_status").eq("agency_id", ctx.agencyId).single();

  const agency = await supabase
    .from("agencies")
    .update({ name: d.name, legal_name: d.legal_name ?? null, kvk_number: d.kvk_number ?? null, vat_number: d.vat_number?.toUpperCase() ?? null })
    .eq("id", ctx.agencyId)
    .select("id")
    .single();
  if (agency.error) return { message: "The agency details could not be saved." };

  const settings = await supabase
    .from("agency_settings")
    .update({
      contact_email: d.contact_email ?? null,
      contact_phone: d.contact_phone ?? null,
      address_line1: d.address_line1 ?? null,
      postal_code: d.postal_code ?? null,
      city: d.city ?? null,
      iban: d.iban ? d.iban.replace(/\s+/g, "").toUpperCase() : null,
      default_payment_term_days: d.default_payment_term_days,
      default_vat_rate: d.default_vat_rate,
      invoice_prefix: d.invoice_prefix,
      waadi_registration_number: d.waadi_registration_number ?? null,
      wtta_status: d.wtta_status,
      wtta_reference: d.wtta_reference ?? null,
      ...(current?.wtta_status !== d.wtta_status ? { wtta_status_checked_at: new Date().toISOString() } : {}),
      late_threshold_minutes: d.late_threshold_minutes,
      missing_checkin_alert_minutes: d.missing_checkin_alert_minutes,
      location_verification_enabled: d.location_verification_enabled,
      location_privacy_notice: d.location_privacy_notice ?? null,
    })
    .eq("agency_id", ctx.agencyId)
    .select("agency_id")
    .single();
  if (settings.error) return { message: "The settings could not be saved." };

  revalidatePath("/admin", "layout");
  return { ok: true, message: "Settings saved." };
}
