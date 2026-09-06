import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_leads",
  title: "List enquiries",
  description: "List customer enquiries (leads) with contact details, preferred date and status.",
  inputSchema: {
    status: z.string().optional().describe("Filter by lead status, e.g. new, contacted, won, lost."),
    limit: z.number().int().optional().describe("Maximum number of leads to return (default 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("leads")
      .select(
        "id,name,phone,email,language,number_of_people,preferred_date,preferred_time,tour_slug,message,source,status,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 25, 1), 100));
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return { ...textResult(JSON.stringify(data ?? [])), structuredContent: { leads: data ?? [] } };
  },
});
