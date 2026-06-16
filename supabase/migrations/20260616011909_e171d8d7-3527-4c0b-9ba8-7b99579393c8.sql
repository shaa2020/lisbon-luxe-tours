
-- Recreate the public view with security_invoker so it respects RLS of the caller
DROP VIEW IF EXISTS public.reviews_public;
CREATE VIEW public.reviews_public
WITH (security_invoker=on) AS
SELECT id, tour_id, tour_slug, author_name, rating, title, body, travel_date, status, featured, created_at, updated_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Allow public to read approved rows on the base table (needed for security_invoker view to work)
DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;
CREATE POLICY "reviews public read approved"
  ON public.reviews
  FOR SELECT
  USING (status = 'approved' OR (auth.role() = 'authenticated' AND private.has_role(auth.uid(), 'admin'::app_role)));

-- Remove the temporary admin-only policy added previously
DROP POLICY IF EXISTS "reviews admin read" ON public.reviews;

-- Revoke column-level access to author_email so anon/authenticated cannot select it directly
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, tour_id, tour_slug, author_name, rating, title, body, travel_date, status, featured, created_at, updated_at)
  ON public.reviews TO anon, authenticated;
-- Note: author_email is intentionally NOT granted; admins must read it via server function using service_role.
