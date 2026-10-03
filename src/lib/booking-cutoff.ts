/** Online bookings need at least this much notice (Lisbon time). */
export const MIN_NOTICE_HOURS = 3;

/** Current Lisbon wall-clock as "YYYY-MM-DD" and minutes since midnight. */
function lisbonNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/** True when a tour on this Lisbon date/time starts too soon (or already passed) to book online. */
export function isTooSoon(
  date: string | null | undefined,
  time: string | null | undefined,
  hours: number = MIN_NOTICE_HOURS,
  now = new Date(),
) {
  if (!date) return false;
  const limit = Math.max(0, hours) * 60;
  const n = lisbonNow(now);
  if (date < n.date) return true;
  if (date > n.date) {
    // Future dates: compute whole minutes until the slot so cutoffs over 24h
    // (e.g. 48h or 72h) are enforced for the day after tomorrow and beyond.
    if (!time) return false;
    const days = Math.round(
      (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${n.date}T00:00:00Z`)) / 86400000,
    );
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h)) return false;
    return h * 60 + (m || 0) + days * 24 * 60 - n.minutes < limit;
  }
  if (!time) return false;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return false;
  return h * 60 + (m || 0) - n.minutes < limit;
}

export function tooSoonMessage(hours: number = MIN_NOTICE_HOURS) {
  const h = Math.max(0, hours);
  const label = h === 1 ? "1 hour" : `${h} hours`;
  return `Tours starting in less than ${label} can't be booked online. Message us on WhatsApp to check last-minute availability.`;
}

export function assertNotTooSoon(
  date: string | null | undefined,
  time: string | null | undefined,
  hours: number = MIN_NOTICE_HOURS,
) {
  if (isTooSoon(date, time, hours)) throw new Error(tooSoonMessage(hours));
}

/** Reads the admin-set notice period (hours) from site settings. */
export async function loadCutoffHours(supabase: any): Promise<number> {
  const { data } = await supabase.from("site_settings").select("booking_cutoff_hours").eq("id", true).maybeSingle();
  const n = Number(data?.booking_cutoff_hours);
  return Number.isFinite(n) && n >= 0 ? n : MIN_NOTICE_HOURS;
}
