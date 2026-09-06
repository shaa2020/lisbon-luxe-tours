import { assertRole } from "./roles";
import {
  bookingRows,
  bookingVars,
  fillPlaceholders,
  sendBrandedEmail,
  type BookingRecord,
} from "./email/dispatch.server";

export const BOOKING_SELECT =
  "id,tour_slug,tour_title,customer_name,email,phone,travel_date,travel_time,guests,option_duration_label,option_price_cents,notes,internal_notes,total_estimate,amount_total,refund_cents,cancel_reason,status,payment_status,source,custom_selections,auto_emails_opt_out,reminder_sent_at,review_request_sent_at,created_at";

export async function assertAdmin(context: { supabase: any; userId: string }) {
  await assertRole(context, "staff");
}

export async function loadBrand(admin: any) {
  const { data } = await admin
    .from("site_settings")
    .select("brand_name,contact_email,contact_phone,address_line1,address_line2,google_review_url")
    .eq("id", true)
    .maybeSingle();
  return {
    brandName: data?.brand_name || "Tuk Tuk 24",
    contactEmail: data?.contact_email || null,
    contactPhone: data?.contact_phone || null,
    addressLine: [data?.address_line1, data?.address_line2].filter(Boolean).join(", ") || null,
    reviewUrl: data?.google_review_url || "https://tuktuk24lisbon.com/reviews",
  };
}

export type EmailOverrides = {
  subject?: string | null;
  heading?: string | null;
  intro?: string | null;
  outro?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  includeDetails?: boolean | null;
  extra?: Record<string, string> | null;
};

/** Resolves the stored template + overrides into the final, placeholder-filled email. */
export async function resolveBookingEmail(
  admin: any,
  booking: BookingRecord,
  templateKey: string,
  overrides: EmailOverrides = {},
) {
  const { data: tpl } = await admin
    .from("email_templates")
    .select("*")
    .eq("key", templateKey)
    .maybeSingle();
  if (!tpl) throw new Error(`Email template "${templateKey}" not found`);

  const brand = await loadBrand(admin);
  const vars = bookingVars(booking, {
    brand_name: brand.brandName,
    review_url: brand.reviewUrl,
    ...(overrides.extra || {}),
  });

  const pick = (o: string | null | undefined, fallback: string) =>
    fillPlaceholders(o != null && o !== "" ? o : fallback, vars);

  const showDetails =
    overrides.includeDetails != null ? overrides.includeDetails : tpl.show_booking_details;

  let rows = showDetails ? bookingRows(booking) : [];
  let ctaUrl = overrides.ctaUrl != null ? overrides.ctaUrl : tpl.cta_url;
  let ctaLabel = overrides.ctaLabel != null ? overrides.ctaLabel : tpl.cta_label;
  if (templateKey === "review_request" && !ctaUrl) ctaUrl = brand.reviewUrl;
  if (templateKey === "invoice") {
    // Emails can't carry attachments, so the invoice CTA points at a private
    // page where the customer downloads the branded PDF.
    if (!ctaUrl) ctaUrl = `https://tuktuk24lisbon.com/invoice/${booking.id}`;
    if (!ctaLabel) ctaLabel = "Download PDF invoice";
  }
  if (templateKey === "payment_request") {
    // Point the button at the secure pay page and spell out the money. When a
    // deposit request is stored, the customer is asked for that amount only.
    const { computeBookingBalance } = await import("./balance-pay.server");
    const balance = await computeBookingBalance(admin, booking.id);
    if (balance) {
      const eur = (c: number) => `€${(c / 100).toFixed(2)}`;
      if (!ctaUrl) ctaUrl = `https://tuktuk24lisbon.com/booking/pay/${booking.id}`;
      if (!ctaLabel)
        ctaLabel =
          balance.requestCents > 0 ? `Pay ${eur(balance.requestCents)} securely now` : "View booking";
      if (showDetails) {
        rows = rows.filter((r) => r.label !== "Total");
        rows.push({ label: "Booking total", value: eur(balance.totalCents) });
        if (balance.paidCents > 0)
          rows.push({ label: "Already paid", value: eur(balance.paidCents) });
        rows.push({
          label: balance.isDeposit ? "Deposit due now" : "Balance due",
          value: eur(balance.requestCents),
        });
        if (balance.isDeposit)
          rows.push({
            label: "Remaining after deposit",
            value: eur(balance.dueCents - balance.requestCents),
          });
      }
    }
  }

  return {
    templateKey,
    label: tpl.label as string,
    subject: pick(overrides.subject, tpl.subject),
    heading: pick(overrides.heading, tpl.heading),
    intro: pick(overrides.intro, tpl.intro),
    outro: pick(overrides.outro, tpl.outro || ""),
    ctaLabel: ctaLabel ? fillPlaceholders(ctaLabel, vars) : null,
    ctaUrl: ctaUrl ? fillPlaceholders(ctaUrl, vars) : null,
    rows,
    brand,
  };
}

export async function sendBookingEmail(
  admin: any,
  booking: BookingRecord,
  templateKey: string,
  overrides: EmailOverrides = {},
  actor?: string | null,
) {
  const resolved = await resolveBookingEmail(admin, booking, templateKey, overrides);
  const result = await sendBrandedEmail(admin, {
    to: booking.email,
    subject: resolved.subject,
    heading: resolved.heading,
    intro: resolved.intro,
    outro: resolved.outro,
    ctaLabel: resolved.ctaLabel,
    ctaUrl: resolved.ctaUrl,
    rows: resolved.rows,
    label: templateKey,
    idempotencyKey: `${templateKey}-${booking.id}-${Date.now()}`,
    brandName: resolved.brand.brandName,
    contactEmail: resolved.brand.contactEmail,
    contactPhone: resolved.brand.contactPhone,
    addressLine: resolved.brand.addressLine,
  });

  await logEvent(
    admin,
    booking.id,
    "email",
    `Queued "${resolved.label}" email to ${booking.email}`,
    {
      template: templateKey,
      subject: resolved.subject,
      queued: result.sent,
      reason: "reason" in result ? result.reason : null,
    },
    actor,
  );

  return { ...result, subject: resolved.subject };
}

export async function logEvent(
  admin: any,
  bookingId: string,
  kind: string,
  summary: string,
  detail?: Record<string, unknown> | null,
  actor?: string | null,
) {
  await admin.from("booking_events").insert({
    booking_id: bookingId,
    kind,
    summary,
    detail: detail ?? null,
    actor: actor ?? null,
  });
}
