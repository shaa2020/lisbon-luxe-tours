import jsPDF from "jspdf";
import type { BusinessInfo } from "./brand";

export type InvoiceOrder = {
  id: string;
  created_at: string;
  amount_total: number; // cents
  currency: string;
  customer_name: string | null;
  customer_email: string | null;
  tour_title: string | null;
  guests: number | null;
  travel_date: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  payment_status: string;
};

const PRIMARY: [number, number, number] = [30, 58, 95]; // ink
const GOLD: [number, number, number] = [191, 149, 63];
const MUTED: [number, number, number] = [110, 120, 135];
const LINE: [number, number, number] = [220, 224, 230];

function invoiceNumber(o: InvoiceOrder) {
  const d = new Date(o.created_at);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `INV-${yyyy}${mm}-${o.id.slice(0, 6).toUpperCase()}`;
}

export function buildInvoicePdf(order: InvoiceOrder, brand: { brandName: string; business: BusinessInfo; logoUrl?: string | null }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;

  const number = invoiceNumber(order);
  const issued = new Date(order.created_at);
  const amountEur = (order.amount_total / 100).toFixed(2);
  const currency = (order.currency || "eur").toUpperCase();
  // Portugal VAT-exempt tour operator margin scheme (RNAAT) — display as included
  const subtotal = amountEur;

  // ===== Header band =====
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, W, 110, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(brand.brandName, M, 50);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 225, 235);
  doc.text(brand.business.addressLine1, M, 68);
  doc.text(brand.business.addressLine2, M, 81);
  doc.text(`${brand.business.contactEmail}  ·  ${brand.business.contactPhone}`, M, 94);

  // Invoice label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...GOLD);
  doc.text("INVOICE", W - M, 55, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(220, 225, 235);
  doc.text(number, W - M, 75, { align: "right" });
  doc.text(issued.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }), W - M, 90, { align: "right" });

  // ===== Bill to =====
  let y = 150;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("BILLED TO", M, y);
  doc.text("PAYMENT", W / 2, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(order.customer_name || "Guest", M, y + 18);
  if (order.customer_email) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(60, 70, 85);
    doc.text(order.customer_email, M, y + 34);
  }

  // payment side
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...PRIMARY);
  doc.text(order.payment_status === "paid" ? "Paid in full" : order.payment_status, W / 2, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Method: Card (Stripe)", W / 2, y + 34);
  if (order.stripe_payment_intent_id) {
    doc.text(`Ref: ${order.stripe_payment_intent_id.slice(0, 28)}`, W / 2, y + 46);
  }

  // ===== Line items table =====
  y = 240;
  // header
  doc.setFillColor(245, 247, 250);
  doc.rect(M, y, W - 2 * M, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("DESCRIPTION", M + 12, y + 18);
  doc.text("QTY", W - M - 180, y + 18, { align: "right" });
  doc.text("AMOUNT", W - M - 12, y + 18, { align: "right" });

  // row
  y += 28;
  const rowY = y + 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(order.tour_title || "Tour booking", M + 12, rowY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const details: string[] = [];
  if (order.travel_date) {
    const d = new Date(order.travel_date);
    details.push(`Travel date: ${d.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}`);
  }
  if (order.guests) details.push(`${order.guests} guest${order.guests === 1 ? "" : "s"}`);
  doc.text(details.join("  ·  "), M + 12, rowY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text(String(order.guests || 1), W - M - 180, rowY, { align: "right" });
  doc.text(`€${amountEur}`, W - M - 12, rowY, { align: "right" });

  // separator
  y = rowY + 36;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.6);
  doc.line(M, y, W - M, y);

  // ===== Totals =====
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", W - M - 140, y);
  doc.setTextColor(...PRIMARY);
  doc.text(`€${subtotal}`, W - M - 12, y, { align: "right" });

  y += 18;
  doc.setTextColor(...MUTED);
  doc.text("VAT", W - M - 140, y);
  doc.setTextColor(...PRIMARY);
  doc.text("Included*", W - M - 12, y, { align: "right" });

  y += 14;
  doc.setDrawColor(...LINE);
  doc.line(W - M - 200, y, W - M, y);

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PRIMARY);
  doc.text("Total paid", W - M - 140, y);
  doc.setTextColor(...GOLD);
  doc.text(`€${amountEur} ${currency}`, W - M - 12, y, { align: "right" });

  // PAID stamp
  if (order.payment_status === "paid") {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.5);
    doc.roundedRect(M, y - 26, 110, 38, 6, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...GOLD);
    doc.text("PAID", M + 55, y - 2, { align: "center" });
  }

  // ===== Notes =====
  y += 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("NOTES", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70, 80, 95);
  const notes = [
    "Thank you for booking with us. Your tour is confirmed — we'll send meeting point details on WhatsApp 24h before departure.",
    "* Price includes VAT under the special tour-operator margin scheme (Decreto-Lei 221/85). No further VAT breakdown is issued.",
    "For changes or questions, reply to this email or message us on WhatsApp.",
  ];
  let ny = y + 14;
  notes.forEach((n) => {
    const lines = doc.splitTextToSize(n, W - 2 * M);
    doc.text(lines, M, ny);
    ny += lines.length * 12 + 4;
  });

  // ===== Footer =====
  const fy = doc.internal.pageSize.getHeight() - 50;
  doc.setDrawColor(...LINE);
  doc.line(M, fy - 14, W - M, fy - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`${brand.brandName} · ${brand.business.addressLine1}, ${brand.business.addressLine2}`, M, fy);
  doc.text(brand.business.footerLegal, M, fy + 11);
  doc.text(number, W - M, fy + 11, { align: "right" });

  return { doc, number };
}

export function downloadInvoice(order: InvoiceOrder, brand: { brandName: string; business: BusinessInfo; logoUrl?: string | null }) {
  const { doc, number } = buildInvoicePdf(order, brand);
  doc.save(`${number}.pdf`);
  return number;
}

export function buildInvoiceMailto(order: InvoiceOrder, number: string, brandName: string) {
  const to = order.customer_email || "";
  const subject = `Your invoice ${number} — ${brandName}`;
  const firstName = (order.customer_name || "there").split(" ")[0];
  const dateLine = order.travel_date
    ? `Tour date: ${new Date(order.travel_date).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}\n`
    : "";
  const body =
    `Hi ${firstName},\n\n` +
    `Thank you for booking with ${brandName}. Your invoice ${number} is attached.\n\n` +
    `Tour: ${order.tour_title || ""}\n` +
    dateLine +
    `Guests: ${order.guests || 1}\n` +
    `Amount paid: €${(order.amount_total / 100).toFixed(2)}\n\n` +
    `We'll be in touch on WhatsApp 24h before departure with meeting point details.\n\n` +
    `Warm regards,\n${brandName} team`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
