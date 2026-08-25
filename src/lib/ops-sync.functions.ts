import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const syncWebsiteBookings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, never>) => input)
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (roleErr) throw new Error(roleErr.message);
    if (!roleRow) throw new Error("Forbidden");

    const { data: siteBookings, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (bErr) throw new Error(bErr.message);

    const { data: existing, error: eErr } = await supabaseAdmin
      .from("ops_bookings")
      .select("source_booking_id")
      .not("source_booking_id", "is", null);
    if (eErr) throw new Error(eErr.message);
    const seen = new Set((existing ?? []).map((r) => r.source_booking_id as string));

    const { data: settings } = await supabaseAdmin
      .from("ops_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    let imported = 0;

    for (const b of siteBookings ?? []) {
      if (seen.has(b.id)) continue;
      if (!b.travel_date) continue;

      // Link or create the operations customer record.
      let customerId: string | null = null;
      if (b.email) {
        const { data: found } = await supabaseAdmin
          .from("ops_customers")
          .select("id")
          .eq("email", b.email)
          .maybeSingle();
        if (found) customerId = found.id;
        else {
          const { data: created } = await supabaseAdmin
            .from("ops_customers")
            .insert({
              name: b.customer_name,
              email: b.email,
              whatsapp: b.phone ?? null,
            })
            .select("id")
            .single();
          customerId = created?.id ?? null;
        }
      }

      const cents = Number(b.amount_total ?? b.total_estimate ?? 0);
      const total = cents > 0 ? cents / 100 : 0;
      const paid = b.payment_status === "paid";

      const { error: insErr } = await supabaseAdmin.from("ops_bookings").insert({
        reference: `WEB-${b.id.slice(0, 8).toUpperCase()}`,
        source_booking_id: b.id,
        customer_id: customerId,
        tour_name: b.tour_title ?? b.tour_slug ?? "Website booking",
        tour_date: b.travel_date,
        start_time: b.travel_time && /^\d{2}:\d{2}/.test(b.travel_time) ? b.travel_time : "10:00",
        duration_hours: Number(settings?.default_duration_hours ?? 2),
        guests: b.guests ?? 2,
        adults: b.guests ?? 2,
        children: 0,
        status: b.status === "cancelled" ? "Cancelled" : paid ? "Confirmed" : "Pending",
        payment_status: paid ? "Paid" : "Unpaid",
        payment_method: "Online Payment",
        base_price: total,
        total,
        currency: settings?.currency ?? "EUR",
        special_requests: b.notes ?? null,
      });
      if (!insErr) imported += 1;
    }

    return { imported };
  });
