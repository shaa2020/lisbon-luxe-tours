import * as React from "react";
import { render } from "@react-email/render";
import BookingNotice from "@/lib/email-templates/booking-notice";
import { fromHeader, REPLY_TO } from "./mailboxes";
import { getOrCreateUnsubscribeToken } from "./unsubscribe-token.server";

const SITE_NAME = "Tuk Tuk 24";
const SENDER_DOMAIN = "notify.tuktuk24lisbon.com";
const SITE_URL = "https://tuktuk24lisbon.com";

export type EmailRow = { label: string; value: string };

export type BookingRecord = {
  id: string;
  tour_title: string | null;
  customer_name: string;
  email: string;
  phone: string | null;
  travel_date: string | null;
  travel_time?: string | null;
  option_duration_label?: string | null;
  guests: number;
  total_estimate: number | null;
  amount_total: number | null;
  refund_cents?: number | null;
  status: string;
  payment_status: string | null;
  notes: string | null;
};

export function bookingRef(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `€${(cents / 100).toFixed(2)}`;
}

export function bookingRows(b: BookingRecord): EmailRow[] {
  const rows: EmailRow[] = [{ label: "Booking reference", value: bookingRef(b.id) }];
  if (b.tour_title) rows.push({ label: "Tour", value: b.tour_title });
  if (b.travel_date) {
    const d = new Date(b.travel_date);
    rows.push({
      label: "Date",
      value:
        d.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) + (b.travel_time ? ` · ${b.travel_time}` : ""),
    });
  }
  if (b.option_duration_label) rows.push({ label: "Duration", value: b.option_duration_label });
  rows.push({ label: "Guests", value: String(b.guests) });
  const totalCents =
    b.amount_total != null
      ? b.amount_total
      : b.total_estimate != null
        ? b.total_estimate * 100
        : null;
  if (totalCents != null) rows.push({ label: "Total", value: money(totalCents) });
  if (b.refund_cents) rows.push({ label: "Refunded", value: money(b.refund_cents) });
  return rows;
}

export function fillPlaceholders(text: string, vars: Record<string, string>) {
  return (text || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => vars[k] ?? "");
}

export function bookingVars(b: BookingRecord, extra: Record<string, string> = {}) {
  const totalCents =
    b.amount_total != null
      ? b.amount_total
      : b.total_estimate != null
        ? b.total_estimate * 100
        : null;
  return {
    customer_name: (b.customer_name || "there").split(" ")[0],
    full_name: b.customer_name || "",
    booking_ref: bookingRef(b.id),
    tour: b.tour_title || "your Lisbon tour",
    date: b.travel_date
      ? new Date(b.travel_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "",
    guests: String(b.guests),
    time: b.travel_time || "",
    total: money(totalCents),
    refund_amount: money(b.refund_cents ?? 0),
    site_url: SITE_URL,
    ...extra,
  };
}

type SupabaseLike = {
  from: (t: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }>;
};

/**
 * Renders the branded booking email and pushes it onto the transactional queue.
 * Used by authenticated admin server functions and the automated reminder job.
 */
export async function sendBrandedEmail(
  supabase: SupabaseLike,
  input: {
    to: string;
    subject: string;
    heading: string;
    intro: string;
    outro?: string;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    rows?: EmailRow[];
    label?: string;
    idempotencyKey?: string;
    brandName?: string;
    contactEmail?: string | null;
    contactPhone?: string | null;
    addressLine?: string | null;
  },
) {
  const to = input.to.trim().toLowerCase();
  const messageId = crypto.randomUUID();

  const { data: suppressed, error: suppressionError } = await supabase
    .from("suppressed_emails")
    .select("id")
    .eq("email", to)
    .maybeSingle();
  if (suppressionError) throw new Error("Could not verify the recipient's email status");
  if (suppressed) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.label || "booking-notice",
      recipient_email: to,
      status: "suppressed",
    });
    return { sent: false, reason: "email_suppressed" as const };
  }

  const preferences = await getOrCreateUnsubscribeToken(supabase, to);
  if (preferences.suppressed || !preferences.token) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.label || "booking-notice",
      recipient_email: to,
      status: "suppressed",
    });
    return { sent: false, reason: "email_suppressed" as const };
  }

  const element = React.createElement(BookingNotice, {
    brandName: input.brandName || SITE_NAME,
    heading: input.heading,
    intro: input.intro,
    outro: input.outro || "",
    ctaLabel: input.ctaLabel ?? null,
    ctaUrl: input.ctaUrl ?? null,
    rows: input.rows || [],
    previewText: input.subject,
    contactEmail: input.contactEmail || undefined,
    contactPhone: input.contactPhone || undefined,
    addressLine: input.addressLine || undefined,
  });
  const html = await render(element);
  const text = await render(element, { plainText: true });

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: input.label || "booking-notice",
    recipient_email: to,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to,
      from: fromHeader(input.brandName || SITE_NAME, input.label || "booking-notice"),
      reply_to: REPLY_TO,
      sender_domain: SENDER_DOMAIN,
      subject: input.subject,
      html,
      text,
      purpose: "transactional",
      label: input.label || "booking-notice",
      idempotency_key: input.idempotencyKey || messageId,
      unsubscribe_token: preferences.token,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.label || "booking-notice",
      recipient_email: to,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    throw new Error("Could not queue the email");
  }

  return { sent: true as const, queued: true as const, messageId };
}
