import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "business_summary",
  title: "Business summary",
  description:
    "Summarise upcoming bookings, guests and expected revenue over a window of days, plus open enquiries.",
  inputSchema: {
    days: z.number().int().optional().describe("How many days ahead to summarise (default 14)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const window = Math.min(Math.max(days ?? 14, 1), 180);
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const until = new Date(today.getTime() + window * 86400000);

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id,travel_date,guests,status,payment_status,amount_total,total_estimate")
      .gte("travel_date", iso(today))
      .lte("travel_date", iso(until))
      .limit(1000);
    if (error) return errorResult(error.message);

    const rows = (bookings ?? []).filter((b) => b.status !== "cancelled");
    const cents = (b: (typeof rows)[number]) =>
      b.amount_total != null
        ? Number(b.amount_total)
        : b.total_estimate != null
          ? Math.round(Number(b.total_estimate) * 100)
          : 0;

    const { count: openLeads } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    const summary = {
      windowDays: window,
      from: iso(today),
      to: iso(until),
      bookings: rows.length,
      guests: rows.reduce((s, b) => s + Number(b.guests || 0), 0),
      expectedRevenueEur: Math.round(rows.reduce((s, b) => s + cents(b), 0)) / 100,
      paidBookings: rows.filter((b) => b.payment_status === "paid").length,
      newEnquiries: openLeads ?? 0,
    };
    return { ...textResult(JSON.stringify(summary)), structuredContent: summary };
  },
});
