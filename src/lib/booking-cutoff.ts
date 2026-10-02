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
export function isTooSoon(date: string | null | undefined, time: string | null | undefined, now = new Date()) {
  if (!date) return false;
  const n = lisbonNow(now);
  if (date < n.date) return true;
  if (date > n.date) {
    // Shortly after midnight edge: tomorrow's early slot within 3h of late-night now.
    const tomorrow = new Date(`${n.date}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    if (date !== tomorrow.toISOString().slice(0, 10) || !time) return false;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + (m || 0) + 24 * 60 - n.minutes < MIN_NOTICE_HOURS * 60;
  }
  if (!time) return false;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return false;
  return h * 60 + (m || 0) - n.minutes < MIN_NOTICE_HOURS * 60;
}

export const TOO_SOON_MESSAGE =
  "Tours starting in less than 3 hours can't be booked online. Message us on WhatsApp to check last-minute availability.";

export function assertNotTooSoon(date: string | null | undefined, time: string | null | undefined) {
  if (isTooSoon(date, time)) throw new Error(TOO_SOON_MESSAGE);
}
