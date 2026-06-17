
-- Fix 1: Stop exposing reviewer emails through the base reviews table.
-- Public reads must go through the reviews_public view (which already excludes author_email).
DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;

-- Allow authenticated admins to still read directly (already covered by other admin policies via has_role on UPDATE/DELETE,
-- but no admin SELECT policy currently exists; add it so admin UIs that query reviews directly keep working).
CREATE POLICY "reviews admin read"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Tighten public booking inserts so anon callers cannot set elevated status/payment_status.
DROP POLICY IF EXISTS "bookings public insert" ON public.bookings;

CREATE POLICY "bookings public insert"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    char_length(customer_name) BETWEEN 1 AND 200
    AND char_length(email) BETWEEN 3 AND 200
    AND char_length(COALESCE(notes, '')) <= 2000
    AND guests BETWEEN 1 AND 50
    AND status = 'new'
    AND payment_status IN ('unpaid', 'pending', 'request')
  );
