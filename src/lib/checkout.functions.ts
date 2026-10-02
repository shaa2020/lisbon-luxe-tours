import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { applyModificationToBooking } from "./booking-changes.server";
import { createPayment, getPaymentByReference, paymentsStatus } from "./payments.server";

const checkoutInput = z.object({
  tour_slug: z.string().max(120),
  tour_title: z.string().min(1).max(200),
  customer_name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().trim().min(6).max(50),
  travel_date: z.string().max(20).optional().nullable(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid start time").optional().nullable(),
  guests: z.number().int().min(1).max(20),
  notes: z.string().max(2000).optional().nullable(),
  amount: z.number().int().min(100).max(500000), // cents, €1–€5000
  image_url: z.string().url().optional().nullable(),
  /** Share of the total charged now. 20–100 (%). Defaults to full payment. */
  deposit_pct: z.number().int().min(20).max(100).optional().nullable(),
  /** Hotel pickup & drop-off requested — priced from the fee stored in Admin. */
  pickup: z.boolean().optional().nullable(),
  /** Meetup point (included) or hotel pickup (chargeable). */
  pickup_type: z.enum(["meetup", "hotel"]).optional().nullable(),
  meetup_point_id: z.string().uuid().optional().nullable(),
  pickup_place_name: z.string().trim().max(200).optional().nullable(),
  pickup_address: z.string().trim().max(400).optional().nullable(),
  pickup_latitude: z.number().optional().nullable(),
  pickup_longitude: z.number().optional().nullable(),
  pickup_place_id: z.string().trim().max(200).optional().nullable(),
  /** Optional promo code — always re-validated and re-priced on the server. */
  discount_code: z.string().trim().max(40).optional().nullable(),
  /** Selected duration option (multi-duration tours only). */
  tour_option_id: z.string().uuid().optional().nullable(),
  /** Guards against double-clicks, refreshes and network retries. */
  idempotency_key: z.string().trim().min(8).max(100).optional().nullable(),
  /** Optional gratuity for the guide, charged with this payment but never part of the fare. */
  tip_cents: z.number().int().min(0).max(100000).optional().nullable(),
});


export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { assertSlotAvailable, buildTourLineItems, tourBaseCents, quoteTourCents } = await import("./catalog.server");
    const payments = await paymentsStatus(supabaseAdmin);

    // Duplicate-submission guard: a repeated click / refresh / retry with the
    // same key returns the original booking instead of creating a second one.
    if (data.idempotency_key) {
      const { data: existing } = await supabaseAdmin
        .from("bookings")
        .select("id")
        .eq("idempotency_key", data.idempotency_key)
        .maybeSingle();
      if (existing) {
        const { data: prior } = await supabaseAdmin
          .from("orders")
          .select("stripe_session_id")
          .eq("booking_id", existing.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (prior?.stripe_session_id) {
          const { getPaymentByReference: getRef } = await import("./payments.server");
          const again = await getRef(prior.stripe_session_id).catch(() => null);
          return {
            mode: "pay" as const,
            message: null,
            url: (again?.checkoutUrl as string | null) ?? null,
            booking_id: existing.id as string,
            sessionId: prior.stripe_session_id as string,
          };
        }
      }
    }

    // Hold the slot: refuse if it filled up while the customer was deciding.
    const { assertNotTooSoon, loadCutoffHours } = await import("./booking-cutoff");
    assertNotTooSoon(data.travel_date, data.time, await loadCutoffHours(supabaseAdmin));
    await assertSlotAvailable(supabaseAdmin, data.travel_date, data.time);

    // Exactly two pickup choices: an included meetup point, or hotel pickup at
    // the fee stored in Admin. The fee is snapshotted onto the booking below.
    const wantsHotelPickup = data.pickup_type === "hotel" || (!data.pickup_type && data.pickup === true);

    let meetup: {
      id: string;
      name: string;
      address: string;
      instructions: string | null;
    } | null = null;
    if (data.pickup_type === "meetup" && data.meetup_point_id) {
      const { data: mp } = await supabaseAdmin
        .from("meetup_points")
        .select("id,name,address,instructions,active")
        .eq("id", data.meetup_point_id)
        .maybeSingle();
      if (!mp || mp.active === false) {
        throw new Error("That meeting point is no longer available. Please choose another.");
      }
      meetup = {
        id: mp.id as string,
        name: mp.name as string,
        address: mp.address as string,
        instructions: (mp.instructions as string | null) ?? null,
      };
    }

    // Re-price from the catalog: never trust the amount sent by the browser.
    const serverQuote = await quoteTourCents(supabaseAdmin, {
      slug: data.tour_slug,
      guests: data.guests,
      pickupRequested: wantsHotelPickup,
      optionId: data.tour_option_id ?? null,
    });
    const appliedPickupFeeCents = wantsHotelPickup ? (serverQuote?.pickupFeeCents ?? 0) : 0;
    const chosenOption = serverQuote?.option ?? null;
    const amountCents = serverQuote?.totalCents ?? data.amount;
    const guestCount = serverQuote?.guests ?? data.guests;

    // Promo code: re-validate server-side and reduce the payable amount.
    const { validateDiscount, recordRedemption } = await import("./discounts.server");
    let discountCents = 0;
    let discountCode: string | null = null;
    let discountCodeId: string | null = null;
    let discountUsedCount = 0;
    if (data.discount_code) {
      const res = await validateDiscount(supabaseAdmin as never, data.discount_code, {
        amountCents,
        guests: guestCount,
      });
      if (res.valid && res.code_id) {
        discountCents = res.discount_cents;
        discountCode = res.code;
        discountCodeId = res.code_id;
        const { data: row } = await supabaseAdmin
          .from("discount_codes")
          .select("used_count")
          .eq("id", res.code_id)
          .maybeSingle();
        discountUsedCount = row?.used_count ?? 0;
      }
    }
    const payableCents = Math.max(100, amountCents - discountCents);

    // Deposit: charge a share now (min 20%), rest is due on the day.
    const depositPct = Math.min(100, Math.max(20, data.deposit_pct ?? 100));
    const chargeCents = depositPct >= 100 ? payableCents : Math.round((payableCents * depositPct) / 100);
    const balanceCents = payableCents - chargeCents;
    const depositNote =
      balanceCents > 0
        ? `Deposit ${depositPct}% — €${(chargeCents / 100).toFixed(2)} paid online, €${(balanceCents / 100).toFixed(2)} balance due on the day.`
        : null;

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_slug: data.tour_slug,
        tour_title: data.tour_title,
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone ?? null,
        travel_date: data.travel_date || null,
        travel_time: data.time || null,
        guests: guestCount,
        // Permanent snapshot of the chosen duration option — later admin price
        // changes must never alter this booking.
        tour_option_id: chosenOption?.id ?? null,
        option_label: chosenOption?.label || null,
        option_duration_label: chosenOption?.durationLabel || null,
        option_duration_minutes: chosenOption?.durationMinutes ?? null,
        option_base_price_cents: chosenOption?.basePriceCents ?? null,
        option_sale_price_cents: chosenOption?.salePriceCents ?? null,
        option_price_cents: chosenOption?.pricePerPersonCents ?? null,
        // Pickup snapshot: the fee charged is frozen here, so a later change to
        // the Hotel Pickup Fee never rewrites an existing booking.
        pickup_type: wantsHotelPickup ? "hotel" : meetup ? "meetup" : null,
        meetup_point_id: meetup?.id ?? null,
        meetup_point_name: meetup?.name ?? null,
        meetup_point_address: meetup?.address ?? null,
        meetup_point_instructions: meetup?.instructions ?? null,
        pickup_place_name: wantsHotelPickup ? data.pickup_place_name || null : null,
        pickup_address: wantsHotelPickup ? data.pickup_address || null : null,
        pickup_latitude: wantsHotelPickup ? data.pickup_latitude ?? null : null,
        pickup_longitude: wantsHotelPickup ? data.pickup_longitude ?? null : null,
        pickup_place_id: wantsHotelPickup ? data.pickup_place_id || null : null,
        pickup_fee_cents: appliedPickupFeeCents,
        idempotency_key: data.idempotency_key || null,
        notes: [
          data.time ? `Preferred time: ${data.time}` : null,
          chosenOption?.durationLabel ? `Duration: ${chosenOption.durationLabel}` : null,
          meetup ? `Meetup point: ${meetup.name} — ${meetup.address}` : null,
          wantsHotelPickup
            ? `Hotel pickup: ${data.pickup_place_name || "address to confirm"}${data.pickup_address ? ` — ${data.pickup_address}` : ""} (+€${(appliedPickupFeeCents / 100).toFixed(2)})`
            : null,
          discountCode ? `Promo code ${discountCode} applied (−€${(discountCents / 100).toFixed(2)})` : null,
          depositNote,
          data.notes,
        ]
          .filter(Boolean)
          .join("\n\n") || null,
        total_estimate: Math.round(payableCents / 100),
        amount_total: payableCents,
        discount_code: discountCode,
        discount_cents: discountCents,
        status: "new",
        tour_status: "upcoming",
        payment_status: payments.available ? "pending" : "request",
      })

      .select("id")
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking insert failed");

    // This guest reached checkout, so any unfinished-checkout follow-up for
    // them is done. Never let a failure here block the booking.
    try {
      await supabaseAdmin
        .from("leads")
        .update({ status: "won" })
        .eq("lead_kind", "abandoned_checkout")
        .eq("email", data.email)
        .in("status", ["new", "contacted"]);
    } catch {
      /* follow-up cleanup only */
    }

    // Copy the business inbox on every new booking.
    {
      const { notifyOwner } = await import("./email/owner-notify.server");
      await notifyOwner(supabaseAdmin as never, {
        subject: `New booking — ${data.tour_title}`,
        heading: "New booking received",
        intro: `${data.customer_name} just booked ${data.tour_title}.`,
        replyTo: data.email,
        label: "owner_alert",
        idempotencyKey: `booking-new-${booking.id}`,
        rows: [
          { label: "Customer", value: data.customer_name },
          { label: "Email", value: data.email },
          { label: "Phone / WhatsApp", value: data.phone || "—" },
          { label: "Date", value: `${data.travel_date || "—"}${data.time ? ` · ${data.time}` : ""}` },
          ...(chosenOption?.durationLabel
            ? [{ label: "Duration", value: chosenOption.durationLabel }]
            : []),
          { label: "Guests", value: String(guestCount) },
          { label: "Total", value: `€${(payableCents / 100).toFixed(2)}` },
        ],
        ctaLabel: "Open bookings",
        ctaUrl: "https://tuktuk24lisbon.com/admin/bookings",
      });

      // Buzz every paired admin device.
      const { sendAdminPush } = await import("./push.server");
      await sendAdminPush(supabaseAdmin as never, {
        title: `New booking · €${(payableCents / 100).toFixed(2)}`,
        body: `${data.customer_name} — ${data.tour_title}, ${guestCount} guest${guestCount > 1 ? "s" : ""}${
          data.travel_date ? ` on ${data.travel_date}` : ""
        }${data.time ? ` at ${data.time}` : ""}`,
        url: "/admin/bookings",
        tag: `booking-${booking.id}`,
      });
    }

    if (discountCodeId && discountCode) {
      await recordRedemption(supabaseAdmin as never, {
        code_id: discountCodeId,
        code: discountCode,
        booking_id: booking.id as string,
        amount_cents: discountCents,
        used_count: discountUsedCount,
      });
    }

    if (!payments.available) {
      return {
        mode: "maintenance" as const,
        message: payments.message,
        booking_id: booking.id as string,
        url: null,
      };
    }

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("hotel_pickup_fee_cents")
      .eq("id", true)
      .maybeSingle();
    const baseCents = await tourBaseCents(supabaseAdmin, data.tour_slug);
    const lineItems =
      balanceCents > 0 || discountCents > 0
        ? [
            {
              priceId: balanceCents > 0 ? "tour_deposit" : "tour_total",
              name:
                balanceCents > 0
                  ? `${data.tour_title} — ${depositPct}% deposit`
                  : `${data.tour_title}${discountCode ? ` (code ${discountCode})` : ""}`,
              unitAmountCents: chargeCents,
              quantity: 1,
            },
          ]

        : buildTourLineItems({
            tourSlug: data.tour_slug,
            tourTitle: data.tour_title,
            guests: guestCount,
            totalCents: payableCents,
            baseCents: serverQuote?.perPersonCents ?? baseCents,
            pickupFeeCents: appliedPickupFeeCents || (settings?.hotel_pickup_fee_cents ?? 0),
            pickupRequested: wantsHotelPickup,
          });

    // Gratuity: charged together with the fare, but kept in its own ledger row
    // so the booking balance and commission never change because of a tip.
    const tipCents = Math.max(0, Math.min(100000, Math.round(data.tip_cents ?? 0)));
    if (tipCents > 0) {
      lineItems.push({
        priceId: "guide_tip",
        name: "Tip for your guide",
        unitAmountCents: tipCents,
        quantity: 1,
      });
    }

    const payment = await createPayment(supabaseAdmin, {
      amountCents: chargeCents + tipCents,
      description: `${data.tour_title} · ${guestCount} guest${guestCount === 1 ? "" : "s"}${data.travel_date ? ` · ${data.travel_date}` : ""}${balanceCents > 0 ? ` · ${depositPct}% deposit` : ""}${tipCents > 0 ? " · incl. guide tip" : ""}`,
      origin,
      lineItems,
      metadata: {
        booking_id: booking.id,
        tour_slug: data.tour_slug,
        guests: String(guestCount),
        deposit_pct: String(depositPct),
        balance_cents: String(balanceCents),
        tip_cents: String(tipCents),
      },
    });


    const orderBase = {
      booking_id: booking.id,
      stripe_session_id: payment.id,
      provider: payment.provider,
      currency: "eur",
      payment_status: "pending",
      customer_name: data.customer_name,
      customer_email: data.email,
      tour_title: data.tour_title,
      tour_slug: data.tour_slug,
      guests: data.guests,
      travel_date: data.travel_date || null,
    };
    await supabaseAdmin.from("orders").insert(
      tipCents > 0
        ? [
            { ...orderBase, amount_total: chargeCents, kind: "tour" },
            { ...orderBase, amount_total: tipCents, kind: "tip" },
          ]
        : [{ ...orderBase, amount_total: chargeCents, kind: "tour" }],
    );

    return {
      mode: "pay" as const,
      message: null,
      url: payment.checkoutUrl as string | null,
      booking_id: booking.id as string,
      sessionId: payment.id as string,
    };
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ session_id: z.string().min(5).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const payment = await getPaymentByReference(data.session_id);
    const paid = payment.status === "paid";
    const newStatus = paid ? "paid" : payment.status || "pending";

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: newStatus,
        stripe_payment_intent_id: payment.id,
      })
      .eq("stripe_session_id", data.session_id);

    // A payment may carry two ledger rows (fare + gratuity); the fare row is
    // the one that drives the booking's status.
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("booking_id, tour_title, amount_total, customer_name, travel_date, guests")
      .eq("stripe_session_id", data.session_id)
      .eq("kind", "tour")
      .maybeSingle();

    if (paid) {
      const { recordTipsForSession } = await import("./tips.server");
      await recordTipsForSession(supabaseAdmin, data.session_id);
    }


    // A declined or unconfirmed attempt must never leave a booking looking paid.
    if (order?.booking_id && !paid) {
      const { syncBookingPaymentStatus } = await import("./balance-pay.server");
      await syncBookingPaymentStatus(supabaseAdmin, order.booking_id);
    }

    if (order?.booking_id && paid) {
      // Single source of truth: recompute from the orders ledger so a deposit
      // stays "deposit_paid" and only a covering balance flips it to "paid".
      const { syncBookingPaymentStatus } = await import("./balance-pay.server");
      await syncBookingPaymentStatus(supabaseAdmin, order.booking_id);



      const { data: mod } = await supabaseAdmin
        .from("booking_modifications")
        .select("id")
        .eq("stripe_session_id", data.session_id)
        .maybeSingle();
      if (mod) {
        await applyModificationToBooking(supabaseAdmin, mod.id);
      }
    }

    // Modification-only payments don't have an orders row.
    if (!order && paid) {
      const { data: mod } = await supabaseAdmin
        .from("booking_modifications")
        .select("id, booking_id")
        .eq("stripe_session_id", data.session_id)
        .maybeSingle();
      if (mod) {
        await supabaseAdmin
          .from("booking_modifications")
          .update({ payment_status: "paid", status: "approved" })
          .eq("id", mod.id);
        await applyModificationToBooking(supabaseAdmin, mod.id);
        const { data: booking } = await supabaseAdmin
          .from("bookings")
          .select("tour_title, amount_total, customer_name")
          .eq("id", mod.booking_id)
          .maybeSingle();
        return {
          paid: true,
          status: "paid",
          booking_id: mod.booking_id as string | null,
          tour_title: booking?.tour_title || null,
          amount_total: booking?.amount_total || 0,
          customer_name: booking?.customer_name || null,
          travel_date: null as string | null,
          guests: null as number | null,
        };
      }
    }

    return {
      paid,
      status: newStatus,
      booking_id: order?.booking_id || null,
      tour_title: order?.tour_title || null,
      amount_total: order?.amount_total || 0,
      customer_name: order?.customer_name || null,
      travel_date: order?.travel_date || null,
      guests: order?.guests || null,
    };
  });
