import { describe, expect, it } from "vitest";
import { agencySettingsSchema, isValidIban } from "./agency";

const base = {
  name: "Acme Staffing", default_payment_term_days: "14", default_vat_rate: "21", invoice_prefix: "inv",
  wtta_status: "unknown", late_threshold_minutes: "5", missing_checkin_alert_minutes: "15",
};

describe("agency settings validation", () => {
  it("validates IBAN checksums", () => {
    expect(isValidIban("NL91 ABNA 0417 1643 00")).toBe(true);
    expect(isValidIban("NL91ABNA0417164301")).toBe(false);
  });

  it("normalises values and coerces numbers", () => {
    const r = agencySettingsSchema.parse({ ...base, legal_name: "" });
    expect(r.invoice_prefix).toBe("INV");
    expect(r.default_payment_term_days).toBe(14);
    expect(r.legal_name).toBeNull();
    expect(r.location_verification_enabled).toBe(false);
  });

  it("rejects malformed KvK and VAT numbers", () => {
    expect(agencySettingsSchema.safeParse({ ...base, kvk_number: "1234" }).success).toBe(false);
    expect(agencySettingsSchema.safeParse({ ...base, vat_number: "123" }).success).toBe(false);
    expect(agencySettingsSchema.safeParse({ ...base, vat_number: "NL123456789B01" }).success).toBe(true);
  });

  it("requires a privacy notice before enabling location verification", () => {
    const r = agencySettingsSchema.safeParse({ ...base, location_verification_enabled: "on", location_privacy_notice: "short" });
    expect(r.success).toBe(false);
  });
});
