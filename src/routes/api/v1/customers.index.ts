import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { apiOk, preflight, withApi } from "@/lib/api/core.server";
import { publicCustomer, upsertCustomer } from "@/lib/api/data.server";

const schema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    phone: z.string().trim().min(5).max(40).optional(),
    whatsapp: z.string().trim().min(5).max(40).optional(),
    email: z.string().trim().email().max(200).optional(),
    country: z.string().trim().max(100).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .refine((v) => Boolean(v.phone || v.whatsapp || v.email), {
    message: "A phone/whatsapp number or an email is required",
  });

export const Route = createFileRoute("/api/v1/customers/")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => preflight(request),
      POST: withApi({ scope: "WRITE_CUSTOMERS" }, async ({ request, body }) => {
        const input = await body((v) => schema.parse(v));
        const { created, customer } = await upsertCustomer({
          name: input.name ?? null,
          phone: input.phone ?? input.whatsapp ?? null,
          email: input.email ?? null,
          country: input.country ?? null,
          notes: input.notes ?? null,
        });
        return apiOk(
          request,
          { created, data: publicCustomer(customer as Record<string, unknown>) },
          created ? 201 : 200,
        );
      }),
    },
  },
});
