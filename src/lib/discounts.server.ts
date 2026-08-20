/** Server-only discount code validation and pricing. */

export type DiscountResult = {
  valid: boolean;
  code: string;
  discount_cents: number;
  message: string;
  code_id?: string;
  description?: string | null;
};

type AnyClient = {
  from: (t: string) => any;
};

export async function validateDiscount(
  client: AnyClient,
  rawCode: string,
  opts: { amountCents: number; guests: number },
): Promise<DiscountResult> {
  const code = rawCode.trim().toUpperCase();
  const fail = (message: string): DiscountResult => ({
    valid: false,
    code,
    discount_cents: 0,
    message,
  });

  if (code.length < 2 || code.length > 40) return fail("Enter a valid promo code.");

  const { data, error } = await client
    .from("discount_codes")
    .select("*")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();

  if (error) return fail("Could not check that code. Please try again.");
  if (!data) return fail("That code isn't valid.");

  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return fail("This code isn't active yet.");
  if (data.expires_at && new Date(data.expires_at).getTime() < now) return fail("This code has expired.");
  if (data.max_uses != null && (data.used_count ?? 0) >= data.max_uses) {
    return fail("This code has reached its usage limit.");
  }
  if (opts.guests < (data.min_guests ?? 1)) {
    return fail(`This code requires at least ${data.min_guests} guests.`);
  }

  const raw =
    data.discount_type === "fixed"
      ? Math.round(data.value * 100)
      : Math.round((opts.amountCents * data.value) / 100);
  const discount_cents = Math.max(0, Math.min(raw, Math.max(0, opts.amountCents - 100)));

  if (discount_cents <= 0) return fail("This code can't be applied to this booking.");

  return {
    valid: true,
    code,
    discount_cents,
    code_id: data.id as string,
    description: (data.description as string | null) ?? null,
    message:
      data.discount_type === "fixed"
        ? `€${(discount_cents / 100).toFixed(2)} off applied.`
        : `${data.value}% off applied — you save €${(discount_cents / 100).toFixed(2)}.`,
  };
}

/** Records a redemption and bumps the usage counter. Never throws. */
export async function recordRedemption(
  client: AnyClient,
  args: { code_id: string; code: string; booking_id: string; amount_cents: number; used_count: number },
) {
  try {
    await client.from("discount_redemptions").insert({
      code_id: args.code_id,
      code: args.code,
      booking_id: args.booking_id,
      amount_cents: args.amount_cents,
    });
    await client
      .from("discount_codes")
      .update({ used_count: args.used_count + 1 })
      .eq("id", args.code_id);
  } catch {
    /* discount bookkeeping must never break checkout */
  }
}
