DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;
CREATE POLICY "Anyone can subscribe" ON public.subscribers FOR INSERT TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND length(email) BETWEEN 5 AND 254 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

DROP POLICY IF EXISTS "tour_meetup_points public read" ON public.tour_meetup_points;
CREATE POLICY "tour_meetup_points public read" ON public.tour_meetup_points FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.meetup_points mp WHERE mp.id = meetup_point_id AND mp.active = true)
    OR authz.has_min_role(auth.uid(), 'staff'::app_role)
  );