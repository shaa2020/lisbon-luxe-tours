import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listToursTool from "./tools/list-tours";
import listBookingsTool from "./tools/list-bookings";
import getBookingTool from "./tools/get-booking";
import listLeadsTool from "./tools/list-leads";
import createLeadTool from "./tools/create-lead";
import businessSummaryTool from "./tools/business-summary";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "tuktuk24",
  title: "TukTuk24",
  version: "0.1.0",
  instructions:
    "Tools for the TukTuk24 Lisbon tuk-tuk tour business. Use `list_tours` for the tour catalogue, `list_bookings` and `get_booking` for reservations, `list_leads` and `create_lead` for customer enquiries, and `business_summary` for an overview of upcoming trips and revenue. All tools act as the signed-in staff account.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listToursTool,
    listBookingsTool,
    getBookingTool,
    listLeadsTool,
    createLeadTool,
    businessSummaryTool,
  ],
});
