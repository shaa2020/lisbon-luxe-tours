DROP POLICY IF EXISTS "bookings public insert" ON public.bookings;
CREATE POLICY "bookings public insert" ON public.bookings
FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(customer_name) >= 1 AND char_length(customer_name) <= 200
  AND char_length(email) >= 3 AND char_length(email) <= 200
  AND char_length(COALESCE(notes, '')) <= 2000
  AND guests >= 1 AND guests <= 50
  AND status = 'new'
  AND payment_status = ANY (ARRAY['unpaid','pending','request'])
  AND COALESCE(amount_total, 0) = 0
  AND COALESCE(total_estimate, 0) = 0
  AND COALESCE(discount_cents, 0) = 0
  AND discount_code IS NULL
);

DROP POLICY IF EXISTS "Anyone can read active discount codes" ON public.discount_codes;
REVOKE SELECT ON public.discount_codes FROM anon;