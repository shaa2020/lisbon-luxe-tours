import { notFound } from "./core.server";
import { CANCELLATION_POLICY_FULL, CANCELLATION_POLICY_SHORT } from "@/lib/cancellation";
import { TIME_SLOTS } from "@/lib/availability.functions";

/**
 * Read/write helpers for the /api/v1 layer. Everything reads from the
 * live admin-managed tables — no duplicated or hard-coded tour data.
 */

const SITE_URL = "https://tuktuk24lisbon.com";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const TOUR_COLUMNS =
  "id, slug, title, category, category_slug, duration, price_from, sale_price, image_url, tagline, description, highlights, itinerary, included, not_included, featured, published, per_person_pricing, sort_order, updated_at";

type TourRow = Record<string, unknown>;

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

export function serializeTour(row: TourRow, pickupFeeCents: number) {
  return {
    id: row["id"],
    slug: row["slug"],
    title: row["title"],
    category: row["category"],
    category_slug: row["category_slug"],
    duration: row["duration"],
    price: row["price_from"],
    sale_price: row["sale_price"] ?? null,
    currency: "EUR",
    pricing_type: row["per_person_pricing"] ? "per_person" : "private",
    tagline: row["tagline"] ?? null,
    description: row["description"],
    highlights: asArray(row["highlights"]),
    itinerary: asArray(row["itinerary"]),
    included: asArray(row["included"]),
    not_included: asArray(row["not_included"]),
    pickup: {
      hotel_pickup_available: true,
      hotel_pickup_fee: Math.round(pickupFeeCents) / 100,
      currency: "EUR",
      note: "Hotel pickup and drop-off in central Lisbon is available for an extra fee. Otherwise guests meet the driver at the agreed meeting point.",
    },
    images: [row["image_url"]].filter(Boolean),
    image_url: row["image_url"] ?? null,
    booking_url: `${SITE_URL}/tours/${row["slug"]}`,
    featured: Boolean(row["featured"]),
    active: Boolean(row["published"]),
    updated_at: row["updated_at"],
  };
}

export async function getSiteSettings() {
  const db = await admin();
  const { data } = await db.from("site_settings").select("*").eq("id", true).maybeSingle();
  return data;
}

export async function listPublishedTours() {
  const db = await admin();
  const settings = await getSiteSettings();
  const fee = settings?.hotel_pickup_fee_cents ?? 0;
  const { data, error } = await db
    .from("tours")
    .select(TOUR_COLUMNS)
    .eq("published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((t) => serializeTour(t as TourRow, fee));
}

export async function getPublishedTour(by: "id" | "slug", value: string) {
  const db = await admin();
  const settings = await getSiteSettings();
  const { data, error } = await db
    .from("tours")
    .select(TOUR_COLUMNS)
    .eq(by, value)
    .eq("published", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) notFound("Tour not found or not published");
  return serializeTour(data as TourRow, settings?.hotel_pickup_fee_cents ?? 0);
}

/* ------------------------------------------------------- availability */

export async function checkAvailability(input: {
  date: string;
  time?: string | null;
  partySize?: number | null;
  tourId?: string | null;
}) {
  const db = await admin();
  const settings = await getSiteSettings();
  const capacity = Math.max(1, settings?.daily_slot_capacity ?? 3);

  const { data: rows, error } = await db
    .from("bookings")
    .select("travel_time, status")
    .eq("travel_date", input.date)
    .neq("status", "cancelled");
  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const r of rows ?? []) {
    const t = (r.travel_time || "").slice(0, 5);
    if (t) counts[t] = (counts[t] ?? 0) + 1;
  }

  const slots = TIME_SLOTS.map((time) => {
    const booked = counts[time] ?? 0;
    return { time, spots_left: Math.max(0, capacity - booked), available: booked < capacity };
  });

  const requested = input.time ? input.time.slice(0, 5) : null;
  const slot = requested ? slots.find((s) => s.time === requested) : null;

  // Never claim availability for a slot the schedule does not know about.
  const available = requested ? Boolean(slot?.available) : slots.some((s) => s.available);

  return {
    available,
    tour_id: input.tourId ?? null,
    date: input.date,
    time: requested,
    party_size: input.partySize ?? null,
    capacity_per_slot: capacity,
    slots,
    ...(requested && !slot
      ? { reason: `Requested time is outside the operating slots (${TIME_SLOTS.join(", ")})` }
      : {}),
  };
}

/* ---------------------------------------------------------- customers */

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits.replace(/^0+/, "")}`;
}

/** Finds a customer by WhatsApp number (or email) and only inserts when new. */
export async function upsertCustomer(input: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  notes?: string | null;
}) {
  const db = await admin();
  const phone = input.phone ? normalizePhone(input.phone) : null;
  const email = input.email ? input.email.trim().toLowerCase() : null;

  let existing: { id: string } | null = null;
  if (phone) {
    const { data } = await db.from("ops_customers").select("id").eq("whatsapp", phone).maybeSingle();
    existing = data ?? null;
  }
  if (!existing && email) {
    const { data } = await db.from("ops_customers").select("id").eq("email", email).maybeSingle();
    existing = data ?? null;
  }

  if (existing) {
    const patch: {
      name?: string;
      whatsapp?: string;
      email?: string;
      country?: string;
    } = {};
    if (input.name) patch.name = input.name;
    if (phone) patch.whatsapp = phone;
    if (email) patch.email = email;
    if (input.country) patch.country = input.country;
    if (Object.keys(patch).length) {
      await db.from("ops_customers").update(patch).eq("id", existing.id);
    }
    const { data } = await db.from("ops_customers").select("*").eq("id", existing.id).maybeSingle();
    return { created: false, customer: data };
  }

  const { data, error } = await db
    .from("ops_customers")
    .insert({
      name: input.name?.trim() || "WhatsApp guest",
      whatsapp: phone,
      email,
      country: input.country ?? null,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { created: true, customer: data };
}

export function publicCustomer(row: Record<string, unknown> | null) {
  if (!row) return null;
  return {
    id: row["id"],
    name: row["name"],
    phone: row["whatsapp"] ?? null,
    email: row["email"] ?? null,
    country: row["country"] ?? null,
    created_at: row["created_at"],
  };
}

/* ------------------------------------------------------ business info */

export async function businessInfo() {
  const db = await admin();
  const settings = await getSiteSettings();
  const { data: faqs } = await db
    .from("faqs")
    .select("question, answer, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const { data: gateways } = await db
    .from("payment_gateways")
    .select("provider, label, is_active")
    .eq("is_active", true);

  return {
    company_name: settings?.brand_name ?? "Tuk Tuk 24 Lisbon",
    website: SITE_URL,
    whatsapp: settings?.whatsapp_phone ?? settings?.contact_phone ?? null,
    phone: settings?.contact_phone ?? null,
    email: settings?.contact_email ?? null,
    address: [settings?.address_line1, settings?.address_line2, settings?.city, settings?.country]
      .filter(Boolean)
      .join(", "),
    social: {
      instagram: settings?.instagram_url ?? null,
      facebook: settings?.facebook_url ?? null,
    },
    pickup_policy: {
      hotel_pickup_available: true,
      fee: Math.round(settings?.hotel_pickup_fee_cents ?? 0) / 100,
      currency: "EUR",
      note: "Hotel pickup and drop-off in central Lisbon is charged as an extra on top of the tour price.",
    },
    payment_methods: (gateways ?? []).map((g) => g.label || g.provider),
    payments_enabled: settings?.payments_enabled ?? true,
    booking_policy: {
      minimum_guests: 2,
      deposit_minimum_percent: 20,
      currency: "EUR",
    },
    cancellation_policy: {
      short: CANCELLATION_POLICY_SHORT,
      full: CANCELLATION_POLICY_FULL,
    },
    operating_slots: TIME_SLOTS,
    faq: (faqs ?? []).map((f) => ({ question: f.question, answer: f.answer })),
  };
}
