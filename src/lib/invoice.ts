import jsPDF from "jspdf";
import type { BusinessInfo } from "./brand";

export type InvoiceOrder = {
  id: string;
  created_at: string;
  amount_total: number; // cents — total value of the booking
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone?: string | null;
  tour_title: string | null;
  guests: number | null;
  travel_date: string | null;
  travel_time?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_session_id?: string | null;
  payment_status: string;
  /** Amount already received, when different from amount_total (deposits). */
  paid_cents?: number | null;
  refund_cents?: number | null;
  payment_method?: string | null;
  reference?: string | null;
};

export type InvoiceBrand = {
  brandName: string;
  business: BusinessInfo;
  logoUrl?: string | null;
};

const INK: [number, number, number] = [30, 58, 95];
const GOLD: [number, number, number] = [191, 149, 63];
const MUTED: [number, number, number] = [110, 120, 135];
const BODY: [number, number, number] = [62, 72, 88];
const LINE: [number, number, number] = [222, 226, 233];
const SOFT: [number, number, number] = [246, 248, 251];

function invoiceNumber(o: InvoiceOrder) {
  const d = new Date(o.created_at);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `INV-${yyyy}${mm}-${(o.reference || o.id).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function money(cents: number) {
  return `EUR ${(cents / 100).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function longDate(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

/** Builds a clean, single-page A4 invoice. Layout flows top-down so nothing overlaps. */
export function buildInvoicePdf(order: InvoiceOrder, brand: InvoiceBrand) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 52;
  const right = W - M;

  const number = invoiceNumber(order);
  const total = Math.max(0, Math.round(order.amount_total || 0));
  const refunded = Math.max(0, Math.round(order.refund_cents || 0));
  const paid =
    order.paid_cents != null
      ? Math.max(0, Math.round(order.paid_cents))
      : order.payment_status === "paid"
        ? total
        : 0;
  const balance = Math.max(0, total - paid - refunded);

  const set = (
    weight: "normal" | "bold",
    size: number,
    color: [number, number, number],
  ) => {
    doc.setFont("helvetica", weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  // ===== Header band =====
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 122, "F");

  set("bold", 21, [255, 255, 255]);
  doc.text(brand.brandName, M, 52);
  set("normal", 8.5, [186, 200, 220]);
  doc.text("PRIVATE TUK-TUK TOURS  ·  LISBON", M, 68);
  doc.text(brand.business.addressLine1, M, 86);
  doc.text(brand.business.addressLine2, M, 98);
  doc.text(
    [brand.business.contactEmail, brand.business.contactPhone].filter(Boolean).join("  ·  "),
    M,
    110,
  );

  set("bold", 24, GOLD);
  doc.text("INVOICE", right, 54, { align: "right" });
  set("normal", 9, [214, 222, 235]);
  doc.text(number, right, 72, { align: "right" });
  doc.text(`Issued ${longDate(order.created_at)}`, right, 86, { align: "right" });

  // ===== Parties =====
  let y = 164;
  const colB = M + (W - 2 * M) / 2;

  set("bold", 8, MUTED);
  doc.text("BILLED TO", M, y);
  doc.text("PAYMENT", colB, y);

  set("bold", 12.5, INK);
  doc.text(order.customer_name || "Guest", M, y + 19);
  const statusLabel =
    balance === 0 && paid > 0
      ? "Paid in full"
      : paid > 0
        ? "Part paid"
        : order.payment_status === "paid"
          ? "Paid in full"
          : "Awaiting payment";
  doc.text(statusLabel, colB, y + 19);

  set("normal", 9.5, BODY);
  let leftY = y + 34;
  if (order.customer_email) {
    doc.text(order.customer_email, M, leftY);
    leftY += 13;
  }
  if (order.customer_phone) doc.text(order.customer_phone, M, leftY);

  set("normal", 9, MUTED);
  let rightY = y + 34;
  doc.text(`Method: ${order.payment_method || "Online payment"}`, colB, rightY);
  const ref = order.stripe_payment_intent_id || order.stripe_session_id;
  if (ref) {
    rightY += 13;
    doc.text(`Ref: ${ref.slice(0, 30)}`, colB, rightY);
  }

  // ===== Line items =====
  y = Math.max(leftY, rightY) + 34;
  const qtyX = right - 168;
  const amountX = right - 12;

  doc.setFillColor(...SOFT);
  doc.rect(M, y, W - 2 * M, 26, "F");
  set("bold", 8, MUTED);
  doc.text("DESCRIPTION", M + 12, y + 17);
  doc.text("GUESTS", qtyX, y + 17, { align: "right" });
  doc.text("AMOUNT", amountX, y + 17, { align: "right" });

  y += 26;
  const titleY = y + 24;
  set("bold", 11.5, INK);
  const title = doc.splitTextToSize(order.tour_title || "Private tour booking", qtyX - M - 40);
  doc.text(title, M + 12, titleY);

  set("normal", 11, INK);
  doc.text(String(order.guests || 1), qtyX, titleY, { align: "right" });
  doc.text(money(total), amountX, titleY, { align: "right" });

  let detailY = titleY + title.length * 14 + 2;
  set("normal", 9, MUTED);
  const details: string[] = [];
  if (order.travel_date) {
    const d = new Date(order.travel_date);
    details.push(
      `Tour date: ${d.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}${order.travel_time ? ` at ${order.travel_time}` : ""}`,
    );
  }
  details.push(`Booking reference: ${(order.reference || order.id).slice(0, 8).toUpperCase()}`);
  details.forEach((line) => {
    doc.text(line, M + 12, detailY);
    detailY += 13;
  });

  y = detailY + 12;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(M, y, right, y);

  // ===== Totals =====
  const labelX = right - 190;
  y += 24;
  const totalsRow = (label: string, value: string, strong = false) => {
    set(strong ? "bold" : "normal", strong ? 12.5 : 10, strong ? INK : MUTED);
    doc.text(label, labelX, y);
    set(strong ? "bold" : "normal", strong ? 12.5 : 10, strong ? GOLD : INK);
    doc.text(value, amountX, y, { align: "right" });
    y += strong ? 24 : 17;
  };

  totalsRow("Subtotal", money(total));
  totalsRow("VAT", "Included*");
  if (paid > 0) totalsRow("Amount received", `- ${money(paid)}`);
  if (refunded > 0) totalsRow("Refunded", `- ${money(refunded)}`);

  y += 4;
  doc.setDrawColor(...LINE);
  doc.line(labelX, y, right, y);
  y += 24;
  totalsRow(balance === 0 ? "Total paid" : "Balance due", money(balance === 0 ? total : balance), true);

  // PAID stamp, aligned with the totals block
  if (balance === 0 && total > 0) {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.4);
    doc.roundedRect(M, y - 52, 104, 36, 6, 6);
    set("bold", 17, GOLD);
    doc.text("PAID", M + 52, y - 28, { align: "center" });
  }

  // ===== Notes =====
  y += 22;
  set("bold", 8, MUTED);
  doc.text("NOTES", M, y);
  y += 15;
  set("normal", 9, BODY);
  const notes = [
    "Thank you for booking with us. Meeting point details are sent on WhatsApp 24 hours before departure.",
    "Free cancellation up to 24 hours before the tour. Cancellations made less than 24 hours before the tour are non-refundable; for rescheduled bookings the original booked date and time is counted.",
    "* Price includes VAT under the special tour-operator margin scheme (Decreto-Lei 221/85), so no separate VAT breakdown is issued.",
  ];
  notes.forEach((note) => {
    const lines = doc.splitTextToSize(note, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 12 + 6;
  });

  // ===== Footer =====
  const fy = H - 54;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.7);
  doc.line(M, fy - 16, right, fy - 16);
  set("normal", 8, MUTED);
  doc.text(
    `${brand.brandName} · ${brand.business.addressLine1}, ${brand.business.addressLine2}`,
    M,
    fy,
  );
  doc.text(brand.business.footerLegal, M, fy + 12);
  doc.text(number, right, fy + 12, { align: "right" });

  return { doc, number };
}

export function downloadInvoice(order: InvoiceOrder, brand: InvoiceBrand) {
  const { doc, number } = buildInvoicePdf(order, brand);
  doc.save(`${number}.pdf`);
  return number;
}

export function invoiceRef(order: InvoiceOrder) {
  return invoiceNumber(order);
}

export function buildInvoiceMailto(order: InvoiceOrder, number: string, brandName: string) {
  const to = order.customer_email || "";
  const subject = `Your invoice ${number} — ${brandName}`;
  const firstName = (order.customer_name || "there").split(" ")[0];
  const dateLine = order.travel_date ? `Tour date: ${longDate(order.travel_date)}\n` : "";
  const body =
    `Hi ${firstName},\n\n` +
    `Thank you for booking with ${brandName}. Your invoice ${number} is attached.\n\n` +
    `Tour: ${order.tour_title || ""}\n` +
    dateLine +
    `Guests: ${order.guests || 1}\n` +
    `Amount: ${money(order.amount_total)}\n\n` +
    `We'll be in touch on WhatsApp 24h before departure with meeting point details.\n\n` +
    `Warm regards,\n${brandName} team`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
