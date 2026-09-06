import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "list_tours",
  title: "List tours",
  description: "List the tours offered by the business, with price, duration and publish status.",
  inputSchema: {
    onlyPublished: z.boolean().optional().describe("Return only tours visible on the website."),
    limit: z.number().int().optional().describe("Maximum number of tours to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ onlyPublished, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tours")
      .select("id,slug,title,category,duration,price_from,sale_price,featured,published")
      .order("sort_order", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (onlyPublished) query = query.eq("published", true);
    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return {
      ...textResult(JSON.stringify(data ?? [])),
      structuredContent: { tours: data ?? [] },
    };
  },
});
