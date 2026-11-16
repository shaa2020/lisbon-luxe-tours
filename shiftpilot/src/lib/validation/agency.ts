import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

/** Dutch IBAN-format check (mod-97) — format only, not account existence. */
export function isValidIban(raw: string): boolean {
  const iban = raw.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem === 1;
}

export const agencySettingsSchema = z
  .object({
    name: z.string().trim().min(2, "Enter the agency name").max(200),
    legal_name: optionalText(200),
    kvk_number: optionalText(8).refine((v) => !v || /^[0-9]{8}$/.test(v), "KvK numbers have 8 digits"),
    vat_number: optionalText(20).refine((v) => !v || /^NL[0-9]{9}B[0-9]{2}$/i.test(v), "Use the format NL123456789B01"),
    contact_email: optionalText(254).refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email"),
    contact_phone: optionalText(30),
    address_line1: optionalText(200),
    postal_code: optionalText(12),
    city: optionalText(100),
    iban: optionalText(40).refine((v) => !v || isValidIban(v), "This IBAN is not valid"),
    default_payment_term_days: z.coerce.number().int().min(0).max(180),
    default_vat_rate: z.coerce.number().min(0).max(100),
    invoice_prefix: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,12}$/, "Use 1–12 letters, digits or dashes"),
    waadi_registration_number: optionalText(50),
    wtta_status: z.enum(["unknown", "not_required", "applied", "authorised", "suspended", "revoked"]),
    wtta_reference: optionalText(100),
    late_threshold_minutes: z.coerce.number().int().min(0).max(120),
    missing_checkin_alert_minutes: z.coerce.number().int().min(0).max(240),
    location_verification_enabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
    location_privacy_notice: optionalText(5000),
  })
  .refine((d) => !d.location_verification_enabled || (d.location_privacy_notice?.length ?? 0) >= 50, {
    path: ["location_privacy_notice"],
    message: "Publish a privacy notice (at least 50 characters) before enabling location verification",
  });

export type AgencySettingsInput = z.infer<typeof agencySettingsSchema>;
