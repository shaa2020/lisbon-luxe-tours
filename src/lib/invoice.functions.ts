import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public invoice lookup. The booking UUID acts as the (unguessable) access key,
 * and only invoice-safe fields are returned.
 */
export const getPublicInvoice = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id,created_at,tour_title,customer_name,email,phone,travel_date,travel_time,guests,total_estimate,amount_total,refund_cents,status,payment_status",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) return null;

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select(
        "brand_name,logo_url,contact_email,contact_phone,address_line1,address_line2,city,country,footer_legal",
      )
      .eq("id", true)
      .maybeSingle();

    const totalCents =
      booking.amount_total != null
        ? booking.amount_total
        : booking.total_estimate != null
          ? booking.total_estimate * 100
          : 0;

    return {
      order: {
        id: booking.id,
        created_at: booking.created_at,
        amount_total: totalCents,
        currency: "eur",
        customer_name: booking.customer_name,
        customer_email: booking.email,
        customer_phone: booking.phone,
        tour_title: booking.tour_title,
        guests: booking.guests,
        travel_date: booking.travel_date,
        travel_time: booking.travel_time,
        refund_cents: booking.refund_cents ?? 0,
        payment_status: booking.payment_status,
        paid_cents: booking.payment_status === "paid" ? totalCents : 0,
      },
      settings: settings ?? null,
    };
  });
