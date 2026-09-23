/**
 * Web Push delivery for the admin app.
 *
 * Sends real lock-screen notifications to every device an admin has paired
 * (stored in public.push_subscriptions). Failures never bubble up — a missed
 * notification must never break a booking or a payment.
 */
import { buildPushPayload, type PushSubscription, type VapidKeys } from "@block65/webcrypto-web-push";

export type AdminPush = {
  title: string;
  body: string;
  /** Path opened when the notification is tapped. */
  url?: string;
  /** Collapses repeats of the same alert. */
  tag?: string;
};

function vapid(): VapidKeys | null {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] || "mailto:bookings@tuktuk24lisbon.com";
  if (!publicKey || !privateKey) return null;
  return { subject, publicKey, privateKey };
}

type Row = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function deliver(row: Row, keys: VapidKeys, message: AdminPush) {
  const subscription: PushSubscription = {
    endpoint: row.endpoint,
    expirationTime: null,
    keys: { p256dh: row.p256dh, auth: row.auth },
  };

  const payload = await buildPushPayload(
    {
      data: JSON.stringify({
        title: message.title,
        body: message.body,
        url: message.url || "/admin",
        tag: message.tag,
      }),
      options: { ttl: 60 * 60 * 12 },
    },
    subscription,
    keys,
  );

  const res = await fetch(row.endpoint, payload);
  return { ok: res.ok, status: res.status, text: res.ok ? "" : await res.text().catch(() => "") };
}

/** Sends a push to every enabled admin device. Never throws. */
export async function sendAdminPush(
  supabase: { from: (t: string) => any },
  message: AdminPush,
  opts?: { userId?: string },
): Promise<{ sent: number; failed: number; devices: number }> {
  const keys = vapid();
  if (!keys) return { sent: 0, failed: 0, devices: 0 };

  try {
    let query = supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("enabled", true);
    if (opts?.userId) query = query.eq("user_id", opts.userId);

    const { data } = await query;
    const rows = (data ?? []) as Row[];
    if (!rows.length) return { sent: 0, failed: 0, devices: 0 };

    let sent = 0;
    let failed = 0;

    await Promise.all(
      rows.map(async (row) => {
        try {
          const result = await deliver(row, keys, message);
          if (result.ok) {
            sent += 1;
            await supabase
              .from("push_subscriptions")
              .update({ last_sent_at: new Date().toISOString(), last_error: null })
              .eq("id", row.id);
            return;
          }
          failed += 1;
          // 404 / 410 mean the device unsubscribed — drop it for good.
          if (result.status === 404 || result.status === 410) {
            await supabase.from("push_subscriptions").delete().eq("id", row.id);
          } else {
            await supabase
              .from("push_subscriptions")
              .update({ last_error: `${result.status} ${result.text}`.slice(0, 300) })
              .eq("id", row.id);
          }
        } catch (err) {
          failed += 1;
          await supabase
            .from("push_subscriptions")
            .update({ last_error: String(err).slice(0, 300) })
            .eq("id", row.id);
        }
      }),
    );

    return { sent, failed, devices: rows.length };
  } catch (err) {
    console.error("Admin push failed:", err);
    return { sent: 0, failed: 0, devices: 0 };
  }
}
