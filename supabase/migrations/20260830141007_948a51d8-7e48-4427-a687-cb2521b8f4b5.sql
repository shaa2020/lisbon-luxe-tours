-- 1) Treat the legacy "admin" check as "manager or above" so every existing policy keeps working
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT CASE
    WHEN _role = 'admin'::public.app_role THEN EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role IN ('admin'::public.app_role, 'owner'::public.app_role, 'manager'::public.app_role)
    )
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = _role
    )
  END
$$;

-- 2) Owner-only surfaces
DROP POLICY IF EXISTS "site settings admin write" ON public.site_settings;
CREATE POLICY "site settings owner write" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "Admins manage discount codes" ON public.discount_codes;
CREATE POLICY "Owners manage discount codes" ON public.discount_codes
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "payment gateways admin all" ON public.payment_gateways;
CREATE POLICY "payment gateways owner all" ON public.payment_gateways
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'owner'::public.app_role));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "users see own roles" ON public.user_roles;
CREATE POLICY "users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_min_role(auth.uid(), 'owner'::public.app_role));

-- 3) Staff-level day-to-day access
CREATE POLICY "bookings staff read" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "bookings staff update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "booking events staff read" ON public.booking_events
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "booking events staff insert" ON public.booking_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "contact staff read" ON public.contact_messages
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "contact staff update" ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "ops bookings staff read" ON public.ops_bookings
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops bookings staff update" ON public.ops_bookings
  FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "ops activities staff read" ON public.ops_booking_activities
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops activities staff insert" ON public.ops_booking_activities
  FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "ops tours staff read" ON public.ops_tours
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops staff staff read" ON public.ops_staff
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops vehicles staff read" ON public.ops_vehicles
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops customers staff read" ON public.ops_customers
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));
CREATE POLICY "ops requests staff read" ON public.ops_change_requests
  FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(), 'staff'::public.app_role));