
-- Public-facing view without author_email
CREATE OR REPLACE VIEW public.reviews_public
WITH (security_invoker=on) AS
SELECT id, tour_id, tour_slug, author_name, rating, title, body, travel_date, status, featured, created_at, updated_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Tighten base table: only admins can SELECT directly (which still lets the view read rows via security_invoker because the invoker is admin... actually security_invoker uses the caller's privileges, so anon reading the view must still be able to SELECT base rows).
-- Use security_definer view instead so the view's owner privileges apply.
DROP VIEW public.reviews_public;
CREATE VIEW public.reviews_public AS
SELECT id, tour_id, tour_slug, author_name, rating, title, body, travel_date, status, featured, created_at, updated_at
FROM public.reviews
WHERE status = 'approved';

GRANT SELECT ON public.reviews_public TO anon, authenticated;

-- Replace public SELECT policy: only admins can read the base table directly
DROP POLICY IF EXISTS "reviews public read approved" ON public.reviews;
CREATE POLICY "reviews admin read"
  ON public.reviews
  FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
