import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calculateModificationAmount,
  createModificationPayment,
  fetchBooking,
} from "./booking-changes.server";
import { paymentsStatus } from "./mollie.server";

const getBookingInput = z.object({
  bookingId: z.string().trim().min(6).max(64),
  email: z.string().email().max(200),
});

export const getBookingForManage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => getBookingInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await fetchBooking(supabaseAdmin, data.bookingId, data.email);
    return {
      id: booking.id,
      tour_slug: booking.tour_slug,
      tour_title: booking.tour_title,
      customer_name: booking.customer_name,
      email: booking.email,
      phone: booking.phone,
      travel_date: booking.travel_date,
      guests: booking.guests,
      total_estimate: booking.total_estimate,
      amount_total: booking.amount_total,
      status: booking.status,
      payment_status: booking.payment_status,
      notes: booking.notes,
      custom_selections: booking.custom_selections,
      created_at: booking.created_at,
    };
  });

const requestChangeInput = z.object({
  bookingId: z.string().trim().min(6).max(64),
  email: z.string().email().max(200),
  changeType: z.enum(["add_guests", "extend_duration"]),
  newGuests: z.number().int().min(1).max(20).optional(),
  note: z.string().max(1000).optional().nullable(),
});

export const requestBookingChange = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => requestChangeInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await fetchBooking(supabaseAdmin, data.bookingId, data.email);

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("hotel_pickup_fee_cents")
      .eq("id", true)
      .maybeSingle();
    const hotelPickupFeeCents = Number(settings?.hotel_pickup_fee_cents || 2000);

    const calc = await calculateModificationAmount(supabaseAdmin, booking, {
      newGuests: data.newGuests,
      hotelPickupFeeCents,
    });

    if (data.changeType === "extend_duration" && calc.differenceCents <= 0) {
      // Duration extensions need an admin quote first.
      const { data: mod, error } = await supabaseAdmin
        .from("booking_modifications")
        .insert({
          booking_id: booking.id,
          change_type: "extend_duration",
          old_value: { guests: calc.oldGuests, amount_cents: calc.oldAmount },
          new_value: { guests: calc.newGuests, amount_cents: calc.newAmountCents },
          difference_cents: 0,
          status: "requested",
          payment_status: "pending",
          notes: data.note || "Customer requested a duration extension. Awaiting admin quote.",
        })
        .select("id")
        .single();
      if (error) throw error;
      return { mode: "request" as const, modificationId: mod.id };
    }

    if (calc.differenceCents <= 0) {
      const { data: mod, error } = await supabaseAdmin
        .from("booking_modifications")
        .insert({
          booking_id: booking.id,
          change_type: data.changeType,
          old_value: { guests: calc.oldGuests, amount_cents: calc.oldAmount },
          new_value: { guests: calc.newGuests, amount_cents: calc.newAmountCents },
          difference_cents: calc.differenceCents,
          status: "requested",
          payment_status: calc.differenceCents < 0 ? "pending" : "waived",
          notes: data.note || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { mode: "request" as const, modificationId: mod.id };
    }

    const { data: mod, error: modErr } = await supabaseAdmin
      .from("booking_modifications")
      .insert({
        booking_id: booking.id,
        change_type: data.changeType,
        old_value: { guests: calc.oldGuests, amount_cents: calc.oldAmount },
        new_value: { guests: calc.newGuests, amount_cents: calc.newAmountCents },
        difference_cents: calc.differenceCents,
        status: "requested",
        payment_status: "pending",
        notes: data.note || null,
      })
      .select("id")
      .single();
    if (modErr || !mod) throw modErr || new Error("Could not create modification");

    const payments = await paymentsStatus(supabaseAdmin);
    if (!payments.available) {
      return { mode: "request" as const, modificationId: mod.id, message: payments.message };
    }



    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await createModificationPayment(
      booking,
      mod.id,
      calc.differenceCents,
      origin,
    );

    await supabaseAdmin
      .from("booking_modifications")
      .update({ stripe_session_id: session.id })
      .eq("id", mod.id);

    await supabaseAdmin.from("orders").insert({
      booking_id: booking.id,
      stripe_session_id: session.id,
      amount_total: calc.differenceCents,
      currency: "eur",
      payment_status: "pending",
      customer_name: booking.customer_name,
      customer_email: booking.email,
      tour_title: booking.tour_title,
      tour_slug: booking.tour_slug || "",
      guests: calc.newGuests,
      travel_date: booking.travel_date,
    });

    return { mode: "pay" as const, url: session.checkoutUrl as string, modificationId: mod.id };
  });

const adminCreateInput = z.object({
  bookingId: z.string().uuid(),
  changeType: z.enum(["add_guests", "extend_duration", "admin_adjustment"]),
  newGuests: z.number().int().min(1).max(20).optional(),
  newAmountCents: z.number().int().min(0).max(500000).optional(),
  note: z.string().max(1000).optional().nullable(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminCreateModificationCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminCreateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const booking = await fetchBooking(supabaseAdmin, data.bookingId);

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("hotel_pickup_fee_cents")
      .eq("id", true)
      .maybeSingle();
    const hotelPickupFeeCents = Number(settings?.hotel_pickup_fee_cents || 2000);

    const calc = await calculateModificationAmount(supabaseAdmin, booking, {
      newGuests: data.newGuests,
      newAmountCents: data.newAmountCents,
      hotelPickupFeeCents,
    });

    const { data: mod, error: modErr } = await supabaseAdmin
      .from("booking_modifications")
      .insert({
        booking_id: booking.id,
        change_type: data.changeType,
        old_value: { guests: calc.oldGuests, amount_cents: calc.oldAmount },
        new_value: { guests: calc.newGuests, amount_cents: calc.newAmountCents },
        difference_cents: calc.differenceCents,
        status: calc.differenceCents === 0 ? "approved" : "requested",
        payment_status: calc.differenceCents <= 0 ? "waived" : "pending",
        notes: data.note || null,
      })
      .select("id")
      .single();
    if (modErr || !mod) throw modErr || new Error("Could not create modification");

    if (calc.differenceCents <= 0) {
      return {
        mode: "waived" as const,
        modificationId: mod.id,
        differenceCents: calc.differenceCents,
      };
    }

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const session = await createModificationPayment(
      booking,
      mod.id,
      calc.differenceCents,
      origin,
    );

    await supabaseAdmin
      .from("booking_modifications")
      .update({ stripe_session_id: session.id })
      .eq("id", mod.id);

    await supabaseAdmin.from("orders").insert({
      booking_id: booking.id,
      stripe_session_id: session.id,
      amount_total: calc.differenceCents,
      currency: "eur",
      payment_status: "pending",
      customer_name: booking.customer_name,
      customer_email: booking.email,
      tour_title: booking.tour_title,
      tour_slug: booking.tour_slug || "",
      guests: calc.newGuests,
      travel_date: booking.travel_date,
    });

    return {
      mode: "pay" as const,
      url: session.checkoutUrl as string,
      modificationId: mod.id,
      differenceCents: calc.differenceCents,
    };
  });

const adminListInput = z.object({ bookingId: z.string().uuid() });

export const adminListModifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminListInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("booking_modifications")
      .select("*")
      .eq("booking_id", data.bookingId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows ?? [];
  });

const adminApplyInput = z.object({ modificationId: z.string().uuid() });

export const adminApplyModification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminApplyInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { applyModificationToBooking } = await import("./booking-changes.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await applyModificationToBooking(supabaseAdmin, data.modificationId);
    return result;
  });

const adminWaiveInput = z.object({ modificationId: z.string().uuid() });

export const adminWaiveModification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => adminWaiveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mod, error } = await supabaseAdmin
      .from("booking_modifications")
      .update({ payment_status: "waived", status: "approved" })
      .eq("id", data.modificationId)
      .select("*")
      .single();
    if (error) throw error;
    return mod;
  });

const sessionUrlInput = z.object({ sessionId: z.string().min(5).max(200) });

export const getStripeSessionUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sessionUrlInput.parse(d))
  .handler(async ({ data }) => {
    const { getMolliePayment } = await import("./mollie.server");
    const payment = await getMolliePayment(data.sessionId);
    return { url: payment.checkoutUrl ?? undefined };
  });
