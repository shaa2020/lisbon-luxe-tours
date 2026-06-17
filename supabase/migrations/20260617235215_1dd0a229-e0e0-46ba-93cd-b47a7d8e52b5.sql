
-- Tighten anonymous read on custom_tour_components to active rows only
DROP POLICY IF EXISTS "Public can view active components" ON public.custom_tour_components;
CREATE POLICY "Anon view active components"
  ON public.custom_tour_components FOR SELECT
  TO anon
  USING (active = true);
CREATE POLICY "Authenticated view components"
  ON public.custom_tour_components FOR SELECT
  TO authenticated
  USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));

-- Defence-in-depth: forbid anonymous submitters from supplying author_email/featured/status overrides at the policy level
DROP POLICY IF EXISTS "reviews public submit" ON public.reviews;
CREATE POLICY "reviews public submit"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND featured = false
    AND author_email IS NULL
  );
