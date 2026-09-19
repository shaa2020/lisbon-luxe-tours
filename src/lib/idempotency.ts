/**
 * Duplicate-submission keys for checkout.
 *
 * The key must be STABLE for the same booking details (so a double click,
 * refresh or network retry reuses the booking that was already created) and
 * DIFFERENT as soon as any detail changes (so a guest who comes back and books
 * another tour/date/party size gets a brand new booking).
 *
 * A per-mount random seed keeps two different visitors apart; the hash of the
 * submitted details keeps repeat bookings from the same visit apart.
 */

export function newIdempotencySeed(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function hash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/** Seed + fingerprint of the booking details currently on the form. */
export function idempotencyKey(seed: string, parts: Array<unknown>) {
  return `${seed}_${hash(parts.map((p) => (p == null ? "" : String(p))).join("|"))}`;
}
