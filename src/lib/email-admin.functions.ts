import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getEmailDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        start: z.string().datetime(),
        end: z.string().datetime(),
        templates: z.array(z.string().max(100)).max(50),
        statuses: z.array(z.enum(["pending", "sent", "failed", "suppressed"])).max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { fetchEmailDashboard } = await import("./email-admin.server");
    return fetchEmailDashboard(context, data);
  });
