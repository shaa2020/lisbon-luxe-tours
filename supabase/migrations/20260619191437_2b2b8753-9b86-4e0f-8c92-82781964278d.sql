CREATE POLICY "bookings_admin_insert"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));