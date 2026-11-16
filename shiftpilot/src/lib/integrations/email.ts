import "server-only";
import { serverEnv } from "@/lib/env";

export type EmailResult =
  | { status: "sent"; providerMessageId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}

/**
 * Resend adapter (https://resend.com/docs/api-reference/emails/send-email).
 * Optional: when RESEND_API_KEY / EMAIL_FROM are absent the call returns
 * `not_configured` and the caller must tell the user — delivery is never
 * reported as successful without a provider message id.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  const apiKey = serverEnv.resendApiKey();
  const from = serverEnv.emailFrom();
  if (!apiKey || !from) return { status: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": msg.idempotencyKey,
      },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok || !body.id) return { status: "failed", error: body.message ?? `HTTP ${res.status}` };
    return { status: "sent", providerMessageId: body.id };
  } catch (e) {
    return { status: "failed", error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function invitationEmail(params: { agencyName: string; inviterName: string; link: string; audience: string }) {
  const { agencyName, inviterName, link, audience } = params;
  const subject = `${agencyName} invited you to ShiftPilot`;
  const text = `${inviterName} invited you to the ${audience} of ${agencyName} on ShiftPilot.\n\nAccept the invitation: ${link}\n\nThis link expires in 7 days. If you did not expect this email, you can ignore it.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;color:#172033">
  <h2 style="color:#10243A">You're invited to ShiftPilot</h2>
  <p>${escapeHtml(inviterName)} invited you to the ${escapeHtml(audience)} of <strong>${escapeHtml(agencyName)}</strong>.</p>
  <p><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563EB;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">Accept invitation</a></p>
  <p style="color:#64748B;font-size:13px">This link expires in 7 days. If you did not expect this email, you can ignore it.</p>
</div>`;
  return { subject, text, html };
}
