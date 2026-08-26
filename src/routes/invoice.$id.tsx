import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { getPublicInvoice } from "@/lib/invoice.functions";
import { downloadInvoice, invoiceRef, type InvoiceOrder } from "@/lib/invoice";
import { DEFAULT_BRAND_NAME, DEFAULT_BUSINESS, type BusinessInfo } from "@/lib/brand";

export const Route = createFileRoute("/invoice/$id")({
  component: InvoicePage,
  head: () => ({
    meta: [
      { title: "Your invoice · Tuk Tuk 24 Lisbon" },
      {
        name: "description",
        content: "Download the PDF invoice for your private tuk-tuk tour in Lisbon.",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Your invoice · Tuk Tuk 24 Lisbon" },
      {
        property: "og:description",
        content: "Download the PDF invoice for your private tuk-tuk tour in Lisbon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

function InvoicePage() {
  const { id } = Route.useParams();
  const fetchInvoice = useServerFn(getPublicInvoice);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-invoice", id],
    queryFn: () => fetchInvoice({ data: { id } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="min-h-[70vh] grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (isError || !data) {
    return (
      <main className="min-h-[70vh] grid place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-2xl text-foreground">Invoice not found</h1>
          <p className="mt-2 text-muted-foreground">
            This invoice link is no longer valid. Reply to your booking email and we'll resend it.
          </p>
        </div>
      </main>
    );
  }

  const s = data.settings as any;
  const business: BusinessInfo = {
    ...DEFAULT_BUSINESS,
    contactEmail: s?.contact_email || DEFAULT_BUSINESS.contactEmail,
    contactPhone: s?.contact_phone || DEFAULT_BUSINESS.contactPhone,
    addressLine1: s?.address_line1 || DEFAULT_BUSINESS.addressLine1,
    addressLine2: s?.address_line2 || DEFAULT_BUSINESS.addressLine2,
    footerLegal: s?.footer_legal || DEFAULT_BUSINESS.footerLegal,
  };
  const brandName = s?.brand_name || DEFAULT_BRAND_NAME;
  const order = data.order as InvoiceOrder;
  const number = invoiceRef(order);

  const rows: { label: string; value: string }[] = [
    { label: "Invoice number", value: number },
    { label: "Booking reference", value: order.id.slice(0, 8).toUpperCase() },
    { label: "Tour", value: order.tour_title || "Private tour booking" },
  ];
  if (order.travel_date) {
    rows.push({
      label: "Tour date",
      value:
        new Date(order.travel_date).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }) + (order.travel_time ? ` · ${order.travel_time}` : ""),
    });
  }
  rows.push({ label: "Guests", value: String(order.guests || 1) });
  rows.push({ label: "Total", value: money(order.amount_total) });
  if (order.refund_cents) rows.push({ label: "Refunded", value: money(order.refund_cents) });

  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">{brandName}</p>
      <h1 className="mt-2 font-display text-3xl text-foreground">Your invoice</h1>
      <p className="mt-2 text-muted-foreground">
        {order.customer_name ? `${order.customer_name.split(" ")[0]}, here` : "Here"} is the invoice
        for your Lisbon tour. Download the PDF for your records.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <span className="text-sm text-muted-foreground">{r.label}</span>
            <span className="text-sm font-semibold text-foreground text-right">{r.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => downloadInvoice(order, { brandName, business })}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        <Download className="w-4 h-4" />
        Download PDF invoice
      </button>

      <p className="mt-8 text-xs text-muted-foreground">
        {brandName} · {business.addressLine1}, {business.addressLine2} · {business.footerLegal}
      </p>
    </main>
  );
}
