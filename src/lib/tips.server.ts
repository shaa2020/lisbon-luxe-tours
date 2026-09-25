import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Gratuities are money for the guide, never part of the tour fare. They are
 * kept in their own `orders` rows (kind = 'tip') so the booking balance,
 * reconciliation and commission maths stay exactly as they were, and are
 * mirrored into `booking_payments` with settlement_kind = 'tip' once the
 * provider confirms the money actually arrived.
 */
export const TIP_KIND = "tip";

/**
 * Records every confirmed tip belonging to a payment reference. Idempotent:
 * a second webhook or page refresh never books the same tip twice.
 */
export async function recordTipsForSession(
  supabase: SupabaseClient<Database>,
  sessionId: string,
): Promise<number> {
  if (!sessionId) return 0;

  const { data: tipOrders } = await supabase
    .from("orders")
    .select("id,booking_id,amount_total,payment_status,kind")
    .eq("stripe_session_id", sessionId)
    .eq("kind", TIP_KIND);

  let recorded = 0;
  for (const o of tipOrders ?? []) {
    if (o.payment_status !== "paid") continue;
    const bookingId = o.booking_id as string | null;
    const amount = Number(o.amount_total || 0);
    if (!bookingId || amount <= 0) continue;

    const { data: already } = await supabase
      .from("booking_payments")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("reference", sessionId)
      .eq("settlement_kind", TIP_KIND)
      .maybeSingle();
    if (already) continue;

    const { data: booking } = await supabase
      .from("bookings")
      .select("id,guide_id,tip_cents")
      .eq("id", bookingId)
      .maybeSingle();

    await supabase.from("booking_payments").insert({
      booking_id: bookingId,
      amount_cents: amount,
      method: "card",
      settlement_kind: TIP_KIND,
      direction: "in",
      reference: sessionId,
      guide_id: (booking?.guide_id as string | null) ?? null,
      commission_cents: 0,
      commission_rate_percent: 0,
      notes: "Guest gratuity paid online — 100% for the guide.",
    });

    await supabase
      .from("bookings")
      .update({ tip_cents: Number(booking?.tip_cents || 0) + amount })
      .eq("id", bookingId);

    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      kind: "tip",
      summary: `Guest tip received: €${(amount / 100).toFixed(2)}`,
    });

    recorded += amount;
  }
  return recorded;
}
