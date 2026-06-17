import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/stripe";

function getStripeKey(): string {
  const key =
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_LIVE_API_KEY ||
    process.env.STRIPE_SANDBOX_API_KEY ||
    "";
  if (!key) throw new Error("Stripe key not configured");
  return key;
}
function getLovableKey(): string {
  const key = process.env.LOVABLE_API_KEY || "";
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  return key;
}

async function stripeFetch(
  path: string,
  init?: { method?: string; form?: Record<string, string> },
) {
  const headers: Record<string, string> = {
    "Lovable-API-Key": getLovableKey(),
    "X-Connection-Api-Key": getStripeKey(),
  };
  let body: BodyInit | undefined;
  if (init?.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  }
  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: init?.method || "GET",
    headers,
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stripe ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export const getCustomTourComponents = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("custom_tour_components")
    .select("id, category, name, description, price_cents, extra_per_guest_cents, image_url, sort_order, active")
    .eq("active", true)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

const selectionInput = z.object({
  component_ids: z.array(z.string().uuid()).min(1).max(30),
  customer_name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(50).optional().nullable(),
  travel_date: z.string().max(20).optional().nullable(),
  time: z.string().max(20).optional().nullable(),
  guests: z.number().int().min(1).max(20),
  notes: z.string().max(2000).optional().nullable(),
  mode: z.enum(["pay", "request"]),
});

export const submitCustomTour = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => selectionInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error: cErr } = await supabaseAdmin
      .from("custom_tour_components")
      .select("id, category, name, price_cents, extra_per_guest_cents, active")
      .in("id", data.component_ids);
    if (cErr) throw new Error(cErr.message);
    const components = (rows ?? []).filter((r) => r.active);
    if (components.length === 0) throw new Error("No valid components selected");

    const hasCat = (cat: string) => components.some((c) => c.category === cat);
    if (!hasCat("vehicle")) throw new Error("Please pick a vehicle");
    if (!hasCat("duration"))
      throw new Error("Please pick a preferred duration — it sets the base tour price");
    if (!hasCat("destination")) throw new Error("Please pick at least one destination");

    const baseTotal = components.reduce((s, c) => s + (c.price_cents || 0), 0);
    const extraPerGuest = components.reduce((s, c: any) => s + (c.extra_per_guest_cents || 0), 0);
    const extraGuests = Math.max(0, data.guests - 2);
    const total = baseTotal + extraPerGuest * extraGuests;
    const selections = components.map((c: any) => ({
      id: c.id,
      category: c.category,
      name: c.name,
      price_cents: c.price_cents,
      extra_per_guest_cents: c.extra_per_guest_cents || 0,
    }));
    const summary = [
      ...components.map((c) => `- ${c.name} (EUR ${(c.price_cents / 100).toFixed(0)} base)`),
      `Base price (up to 2 guests): EUR ${(baseTotal / 100).toFixed(0)}`,
      `Extra guests: ${extraGuests} × EUR ${(extraPerGuest / 100).toFixed(0)} = EUR ${((extraPerGuest * extraGuests) / 100).toFixed(0)}`,
      `Guests: ${data.guests}`,
      `Total: EUR ${(total / 100).toFixed(0)}`,
    ].join("\n");

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .insert({
        tour_slug: "custom",
        tour_title: "Custom Tour",
        customer_name: data.customer_name,
        email: data.email,
        phone: data.phone ?? null,
        travel_date: data.travel_date || null,
        guests: data.guests,
        notes: [
          data.time ? `Preferred time: ${data.time}` : null,
          "Selected components:",
          summary,
          data.notes ? `\nCustomer notes:\n${data.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        total_estimate: Math.round(total / 100),
        amount_total: total,
        status: "new",
        payment_status: data.mode === "request" ? "request" : "pending",
        custom_selections: selections,
      })
      .select("id")
      .single();
    if (bErr || !booking) throw new Error(bErr?.message || "Booking insert failed");

    if (data.mode === "request") {
      return { mode: "request" as const, booking_id: booking.id, total };
    }

    if (total < 100) throw new Error("Total must be at least 1 EUR to checkout");

    const host = getRequestHost();
    const proto = host.includes("localhost") ? "http" : "https";
    const origin = `${proto}://${host}`;

    const form: Record<string, string> = {
      mode: "payment",
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(total),
      "line_items[0][price_data][product_data][name]":
        `Custom Tour - ${data.guests} guest${data.guests === 1 ? "" : "s"}`,
      "line_items[0][price_data][product_data][description]": summary.slice(0, 500),
      customer_email: data.email,
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/cancelled?session_id={CHECKOUT_SESSION_ID}`,
      "metadata[booking_id]": booking.id,
      "metadata[tour_slug]": "custom",
      "metadata[guests]": String(data.guests),
    };

    const session = await stripeFetch("/v1/checkout/sessions", { method: "POST", form });

    await supabaseAdmin.from("orders").insert({
      booking_id: booking.id,
      stripe_session_id: session.id,
      amount_total: total,
      currency: "eur",
      payment_status: "pending",
      customer_name: data.customer_name,
      customer_email: data.email,
      tour_title: "Custom Tour",
      tour_slug: "custom",
      guests: data.guests,
      travel_date: data.travel_date || null,
    });

    return { mode: "pay" as const, url: session.url as string, sessionId: session.id as string };
  });

// ===== Admin =====
const upsertInput = z.object({
  id: z.string().uuid().optional().nullable(),
  category: z.enum(["vehicle", "destination", "addon", "duration"]),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  price_cents: z.number().int().min(0).max(1_000_000),
  image_url: z.string().trim().max(2000).url().optional().nullable().or(z.literal("")),
  sort_order: z.number().int().min(0).max(9999),
  active: z.boolean(),
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

export const adminListComponents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("custom_tour_components")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      category: data.category,
      name: data.name,
      description: data.description ?? null,
      price_cents: data.price_cents,
      image_url: data.image_url ? data.image_url : null,
      sort_order: data.sort_order,
      active: data.active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("custom_tour_components")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("custom_tour_components")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminDeleteComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("custom_tour_components")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
