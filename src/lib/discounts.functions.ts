import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  code: z.string().trim().min(2).max(40),
  amount_cents: z.number().int().min(100).max(500000),
  guests: z.number().int().min(1).max(20),
});

/** Public: checks a promo code and returns the discount it would give. */
export const checkDiscountCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { validateDiscount } = await import("./discounts.server");
    const res = await validateDiscount(supabaseAdmin as never, data.code, {
      amountCents: data.amount_cents,
      guests: data.guests,
    });
    return {
      valid: res.valid,
      code: res.code,
      discount_cents: res.discount_cents,
      message: res.message,
    };
  });
