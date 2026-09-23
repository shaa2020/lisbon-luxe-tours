import { sendBrandedEmail, type EmailRow } from "./dispatch.server";

/** Inbox that receives a copy of every customer message / new booking. */
export const DEFAULT_OWNER_INBOX = "tuktuklisbon24@gmail.com";

type SupabaseLike = Parameters<typeof sendBrandedEmail>[0] & {
  from: (t: string) => any;
};

async function ownerInbox(supabase: SupabaseLike): Promise<string[]> {
  try {
    // Kept out of site_settings: that table is readable by website visitors.
    const { data } = await supabase
      .from("private_settings")
      .select("owner_notification_email")
      .maybeSingle();
    const str = String((data as { owner_notification_email?: string } | null)?.owner_notification_email ?? "");
    const list = str
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));
    if (list.length) return list;
  } catch {
    /* fall through to the default inbox */
  }
  return [DEFAULT_OWNER_INBOX];
}

/**
 * Sends an internal alert to the business inbox. Never throws:
 * a failed notification must not break the customer's action.
 */
export async function notifyOwner(
  supabase: SupabaseLike,
  input: {
    heading: string;
    intro: string;
    rows?: EmailRow[];
    subject: string;
    replyTo?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    label?: string;
    idempotencyKey?: string;
  },
) {
  try {
    const recipients = await ownerInbox(supabase);
    for (const to of recipients) {
      await sendBrandedEmail(supabase, {
        to,
        subject: input.subject,
        heading: input.heading,
        intro: input.intro,
        outro: input.replyTo ? `Reply directly to the customer at ${input.replyTo}.` : "",
        ctaLabel: input.ctaLabel ?? null,
        ctaUrl: input.ctaUrl ?? null,
        rows: input.rows || [],
        label: input.label || "owner_alert",
        idempotencyKey: input.idempotencyKey
          ? `${input.idempotencyKey}-${to}`
          : undefined,
      });
    }
  } catch (err) {
    console.error("Owner notification failed:", err);
  }
}
