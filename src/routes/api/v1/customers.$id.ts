import { createFileRoute } from "@tanstack/react-router";
import { apiOk, notFound, preflight, withApi } from "@/lib/api/core.server";
import { publicCustomer } from "@/lib/api/data.server";

export const Route = createFileRoute("/api/v1/customers/$id")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      GET: withApi({ scope: "READ_CUSTOMERS" }, async ({ request, params }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const id = params["id"]!;
        const isUuid = /^[0-9a-f-]{36}$/i.test(id);

        const { data } = await supabaseAdmin
          .from("ops_customers")
          .select("id, name, whatsapp, email, country, created_at")
          .eq(isUuid ? "id" : "whatsapp", isUuid ? id : decodeURIComponent(id))
          .maybeSingle();

        if (!data) notFound("Customer not found");
        return apiOk(request, { data: publicCustomer(data as Record<string, unknown>) });
      }),
    },
  },
});
