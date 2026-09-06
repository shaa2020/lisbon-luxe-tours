import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description:
    "List bookings with guest name, tour, travel date, guests, status and payment status. Requires a staff account.",
  inputSchema: {
    fromDate: z.string().optional().describe("Only bookings travelling on or after this date (YYYY-MM-DD)."),
    toDate: z.string().optional().describe("Only bookings travelling on or before this date (YYYY-MM-DD)."),
    status: z.string().optional().describe("Filter by booking status, e.g. pending, confirmed, cancelled."),
    limit: z.number().int().optional().describe("Maximum number of bookings to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ fromDate, toDate, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("bookings")
      .select(
        "id,customer_name,email,phone,tour_title,tour_slug,travel_date,travel_time,guests,status,payment_status,amount_total,total_estimate,created_at",
      )
      .order("travel_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (fromDate) query = query.gte("travel_date", fromDate);
    if (toDate) query = query.lte("travel_date", toDate);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return {
      ...textResult(JSON.stringify(data ?? [])),
      structuredContent: { bookings: data ?? [] },
    };
  },
});
