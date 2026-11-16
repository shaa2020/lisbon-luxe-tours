"use client";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/forms/submit-button";
import type { Tables } from "@/lib/database.types";
import type { FormState } from "@/app/(auth)/actions";
import { updateAgencySettingsAction } from "./actions";

type Agency = Pick<Tables<"agencies">, "name" | "legal_name" | "kvk_number" | "vat_number" | "slug">;

const WTTA = [
  ["unknown", "Unknown / not yet checked"],
  ["not_required", "Not required"],
  ["applied", "Application submitted"],
  ["authorised", "Authorised"],
  ["suspended", "Suspended"],
  ["revoked", "Revoked"],
] as const;

export function AgencySettingsForm({ agency, settings }: { agency: Agency; settings: Tables<"agency_settings"> }) {
  const [state, action] = useActionState<FormState, FormData>(updateAgencySettingsAction, {});
  const e = state.errors ?? {};
  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.message && !state.ok && <Alert tone="danger">{state.message}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Shown on invoices and contracts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="name" label="Trading name" error={e.name} required>
            <Input name="name" defaultValue={agency.name} />
          </FormField>
          <FormField id="legal_name" label="Legal name" error={e.legal_name}>
            <Input name="legal_name" defaultValue={agency.legal_name ?? ""} />
          </FormField>
          <FormField id="kvk_number" label="KvK number" error={e.kvk_number}>
            <Input name="kvk_number" inputMode="numeric" defaultValue={agency.kvk_number ?? ""} />
          </FormField>
          <FormField id="vat_number" label="VAT number" error={e.vat_number}>
            <Input name="vat_number" defaultValue={agency.vat_number ?? ""} placeholder="NL123456789B01" />
          </FormField>
          <FormField id="contact_email" label="Contact email" error={e.contact_email}>
            <Input name="contact_email" type="email" defaultValue={settings.contact_email ?? ""} />
          </FormField>
          <FormField id="contact_phone" label="Contact phone" error={e.contact_phone}>
            <Input name="contact_phone" type="tel" defaultValue={settings.contact_phone ?? ""} />
          </FormField>
          <FormField id="address_line1" label="Address" error={e.address_line1} className="sm:col-span-2">
            <Input name="address_line1" defaultValue={settings.address_line1 ?? ""} />
          </FormField>
          <FormField id="postal_code" label="Postal code" error={e.postal_code}>
            <Input name="postal_code" defaultValue={settings.postal_code ?? ""} />
          </FormField>
          <FormField id="city" label="City" error={e.city}>
            <Input name="city" defaultValue={settings.city ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoicing defaults</CardTitle>
          <CardDescription>Used for new clients and invoices. Client-specific terms override these.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="iban" label="IBAN" error={e.iban}>
            <Input name="iban" defaultValue={settings.iban ?? ""} autoComplete="off" />
          </FormField>
          <FormField id="invoice_prefix" label="Invoice number prefix" hint="Numbers are issued as PREFIX-YEAR-00001." error={e.invoice_prefix}>
            <Input name="invoice_prefix" defaultValue={settings.invoice_prefix} />
          </FormField>
          <FormField id="default_payment_term_days" label="Payment term (days)" error={e.default_payment_term_days}>
            <Input name="default_payment_term_days" type="number" min={0} max={180} defaultValue={settings.default_payment_term_days} />
          </FormField>
          <FormField id="default_vat_rate" label="Default VAT rate (%)" hint="Confirm the applicable rate with your tax adviser." error={e.default_vat_rate}>
            <Input name="default_vat_rate" type="number" step="0.01" min={0} max={100} defaultValue={settings.default_vat_rate} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staffing registrations</CardTitle>
          <CardDescription>
            Recorded for compliance tracking. ShiftPilot stores the status you enter; it does not verify registrations with
            public registers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="waadi_registration_number" label="Waadi registration number" error={e.waadi_registration_number}>
            <Input name="waadi_registration_number" defaultValue={settings.waadi_registration_number ?? ""} />
          </FormField>
          <div />
          <FormField id="wtta_status" label="Wtta authorisation status" error={e.wtta_status}>
            <NativeSelect name="wtta_status" defaultValue={settings.wtta_status}>
              {WTTA.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="wtta_reference" label="Wtta reference" error={e.wtta_reference}>
            <Input name="wtta_reference" defaultValue={settings.wtta_reference ?? ""} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance policy</CardTitle>
          <CardDescription>
            Location verification is optional and off by default. When enabled, workers see the privacy notice and location is
            recorded only at check-in and check-out — never continuously.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="late_threshold_minutes" label="Late after (minutes)" error={e.late_threshold_minutes}>
            <Input name="late_threshold_minutes" type="number" min={0} max={120} defaultValue={settings.late_threshold_minutes} />
          </FormField>
          <FormField id="missing_checkin_alert_minutes" label="Missing check-in alert after (minutes)" error={e.missing_checkin_alert_minutes}>
            <Input name="missing_checkin_alert_minutes" type="number" min={0} max={240} defaultValue={settings.missing_checkin_alert_minutes} />
          </FormField>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="location_verification_enabled" defaultChecked={settings.location_verification_enabled} className="mt-0.5 size-4 accent-primary" />
            <span>
              <span className="font-medium">Enable location verification at check-in/check-out</span>
              <span className="block text-muted-foreground">Requires a lawful basis and a published privacy notice.</span>
            </span>
          </label>
          <FormField id="location_privacy_notice" label="Location privacy notice" error={e.location_privacy_notice} className="sm:col-span-2">
            <Textarea name="location_privacy_notice" rows={4} defaultValue={settings.location_privacy_notice ?? ""} />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  );
}
