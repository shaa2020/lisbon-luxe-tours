import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

const SELECT =
  "id,customer_name,email,phone,tour_title,tour_slug,travel_date,travel_time,guests,notes,status,payment_status,amount_total,total_estimate,discount_code,discount_cents,refund_cents,source,internal_notes,created_at";

export default defineTool({
  name: "get_booking",
  title: "Get booking",
  description:
    "Look up one booking by its full id or by the short reference (the first 8 characters of the id).",
  inputSchema: {
    reference: z.string().describe("Booking id or short reference code."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ reference }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const ref = reference.trim().toLowerCase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(ref);

    if (isUuid) {
      const { data, error } = await supabase.from("bookings").select(SELECT).eq("id", ref).maybeSingle();
      if (error) return errorResult(error.message);
      if (!data) return errorResult("No booking found for that reference");
      return { ...textResult(JSON.stringify(data)), structuredContent: { booking: data } };
    }

    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) return errorResult(error.message);
    const match = (data ?? []).find((b) => String(b.id).slice(0, 8).toLowerCase() === ref);
    if (!match) return errorResult("No booking found for that reference");
    return { ...textResult(JSON.stringify(match)), structuredContent: { booking: match } };
  },
});
