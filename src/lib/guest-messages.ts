export type GuestTemplate = {
  id: string;
  key: string;
  language: string;
  label: string;
  body: string;
  sort_order: number;
  active: boolean;
};

export const PLACEHOLDERS = [
  "guest_name",
  "tour",
  "date",
  "time",
  "meeting_point",
  "map_link",
  "guide_name",
  "guide_phone",
  "balance_due",
  "balance_line",
  "reference",
  "review_link",
] as const;

const euro = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

export function fillTemplate(
  body: string,
  b: any,
  guide: { name?: string | null; phone?: string | null; whatsapp?: string | null } | null,
  dueCents = 0,
) {
  const meeting =
    b.pickup_type === "hotel"
      ? b.pickup_place_name || b.pickup_address || "your hotel"
      : b.meetup_point_name || b.meetup_point_address || "the meeting point";
  const mapLink =
    b.pickup_latitude && b.pickup_longitude
      ? `https://maps.google.com/?q=${b.pickup_latitude},${b.pickup_longitude}`
      : b.meetup_point_address || b.pickup_address
        ? `https://maps.google.com/?q=${encodeURIComponent(b.meetup_point_address || b.pickup_address)}`
        : "";
  const vals: Record<string, string> = {
    guest_name: (b.customer_name || "there").split(" ")[0],
    tour: b.tour_title || "tour",
    date: b.travel_date ? new Date(b.travel_date).toLocaleDateString("en-GB", { day: "numeric", month: "long" }) : "",
    time: (b.travel_time || "").slice(0, 5),
    meeting_point: meeting,
    map_link: mapLink,
    guide_name: guide?.name || "our guide",
    guide_phone: guide?.whatsapp || guide?.phone || "+351 our team",
    balance_due: euro(dueCents),
    balance_line: dueCents > 0 ? `Balance to pay on the day: ${euro(dueCents)}. ` : "",
    reference: b.booking_reference || String(b.id).slice(0, 8).toUpperCase(),
    review_link: "https://tuktuk24lisbon.com/reviews",
  };
  return body
    .replace(/\{(\w+)\}/g, (m, k) => (k in vals ? vals[k] : m))
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function waUrl(phone: string | null | undefined, text: string) {
  const num = String(phone || "").replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}
