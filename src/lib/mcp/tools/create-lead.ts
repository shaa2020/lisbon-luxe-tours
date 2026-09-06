import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

export default defineTool({
  name: "create_lead",
  title: "Create enquiry",
  description:
    "Record a new customer enquiry (for example one that arrived by WhatsApp, phone or email) so it appears in the admin panel.",
  inputSchema: {
    name: z.string().optional().describe("Customer name."),
    phone: z.string().optional().describe("WhatsApp or phone number."),
    email: z.string().optional().describe("Customer email address."),
    numberOfPeople: z.number().int().optional().describe("How many guests."),
    preferredDate: z.string().optional().describe("Preferred travel date (YYYY-MM-DD)."),
    preferredTime: z.string().optional().describe("Preferred start time, e.g. 10:00."),
    tourSlug: z.string().optional().describe("Slug of the tour they asked about."),
    message: z.string().optional().describe("What the customer asked for."),
    source: z.string().optional().describe("Where the enquiry came from, e.g. whatsapp, phone, email."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    if (!input.name && !input.phone && !input.email)
      return errorResult("Provide at least a name, phone number or email for the enquiry.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("leads")
      .insert({
        name: input.name ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        number_of_people: input.numberOfPeople ?? null,
        preferred_date: input.preferredDate ?? null,
        preferred_time: input.preferredTime ?? null,
        tour_slug: input.tourSlug ?? null,
        message: input.message ?? null,
        source: input.source ?? "mcp",
      })
      .select("id,name,phone,email,status,created_at")
      .single();
    if (error) return errorResult(error.message);
    return { ...textResult(JSON.stringify(data)), structuredContent: { lead: data } };
  },
});
