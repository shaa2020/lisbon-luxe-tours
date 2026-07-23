export const CANCELLATION_POLICY_SHORT = "Free cancellation up to 24 hours before the tour.";

export const CANCELLATION_POLICY_FULL =
  "Free cancellation up to 24 hours before the tour. Cancellations made less than 24 hours before the tour are non-refundable. If you reschedule and later cancel, refund eligibility is calculated from the original booked date and time, not the rescheduled one.";

export const CANCELLATION_POLICY_BULLETS: { ok: boolean; text: string }[] = [
  {
    ok: true,
    text: "Free cancellation up to 24 hours before your tour start time — full refund, no questions asked.",
  },
  {
    ok: false,
    text: "Cancellations made less than 24 hours before the tour are non-refundable.",
  },
  {
    ok: false,
    text: "If you reschedule and later cancel, refund eligibility is calculated from the ORIGINAL booked date and time — not the rescheduled one.",
  },
  {
    ok: true,
    text: "Rescheduling within the 24h window is possible subject to availability — message us on WhatsApp.",
  },
];
