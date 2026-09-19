-- 1. Meetup points
CREATE TABLE IF NOT EXISTS public.meetup_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  map_url text,
  latitude double precision,
  longitude double precision,
  instructions text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.meetup_points TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetup_points TO authenticated;
GRANT ALL ON public.meetup_points TO service_role;

ALTER TABLE public.meetup_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meetup_points public read active" ON public.meetup_points
  FOR SELECT USING (active = true);
CREATE POLICY "meetup_points staff read" ON public.meetup_points
  FOR SELECT USING (authz.has_min_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "meetup_points manager insert" ON public.meetup_points
  FOR INSERT WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "meetup_points manager update" ON public.meetup_points
  FOR UPDATE USING (authz.has_min_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "meetup_points manager delete" ON public.meetup_points
  FOR DELETE USING (authz.has_min_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER meetup_points_updated BEFORE UPDATE ON public.meetup_points
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tour <-> meetup point assignment
CREATE TABLE IF NOT EXISTS public.tour_meetup_points (
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  meetup_point_id uuid NOT NULL REFERENCES public.meetup_points(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (tour_id, meetup_point_id)
);

GRANT SELECT ON public.tour_meetup_points TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_meetup_points TO authenticated;
GRANT ALL ON public.tour_meetup_points TO service_role;

ALTER TABLE public.tour_meetup_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour_meetup_points public read" ON public.tour_meetup_points
  FOR SELECT USING (true);
CREATE POLICY "tour_meetup_points manager insert" ON public.tour_meetup_points
  FOR INSERT WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "tour_meetup_points manager update" ON public.tour_meetup_points
  FOR UPDATE USING (authz.has_min_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "tour_meetup_points manager delete" ON public.tour_meetup_points
  FOR DELETE USING (authz.has_min_role(auth.uid(), 'manager'::app_role));

CREATE INDEX IF NOT EXISTS tour_meetup_points_meetup_idx ON public.tour_meetup_points (meetup_point_id);

-- 3. Booking pickup + reference + tour status (all additive, nullable/defaulted)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_type text,
  ADD COLUMN IF NOT EXISTS meetup_point_id uuid REFERENCES public.meetup_points(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS meetup_point_name text,
  ADD COLUMN IF NOT EXISTS meetup_point_address text,
  ADD COLUMN IF NOT EXISTS meetup_point_instructions text,
  ADD COLUMN IF NOT EXISTS pickup_place_name text,
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS pickup_latitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_longitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_place_id text,
  ADD COLUMN IF NOT EXISTS pickup_fee_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_instructions text,
  ADD COLUMN IF NOT EXISTS booking_reference text,
  ADD COLUMN IF NOT EXISTS tour_status text NOT NULL DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.ops_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.ops_vehicles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

-- Backfill tour_status from the existing status column
UPDATE public.bookings SET tour_status = CASE
  WHEN status = 'cancelled' THEN 'cancelled'
  WHEN status = 'done' THEN 'completed'
  WHEN status = 'confirmed' THEN 'confirmed'
  ELSE 'upcoming'
END;

-- Backfill human booking references for existing rows
WITH numbered AS (
  SELECT id, to_char(created_at, 'YYYY') AS yr,
         row_number() OVER (PARTITION BY to_char(created_at, 'YYYY') ORDER BY created_at) AS n
  FROM public.bookings
)
UPDATE public.bookings b
SET booking_reference = 'TT-' || numbered.yr || '-' || lpad(numbered.n::text, 4, '0')
FROM numbered
WHERE numbered.id = b.id AND b.booking_reference IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_booking_reference_key ON public.bookings (booking_reference);
CREATE UNIQUE INDEX IF NOT EXISTS bookings_idempotency_key_uniq ON public.bookings (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_travel_date_idx ON public.bookings (travel_date);
CREATE INDEX IF NOT EXISTS bookings_email_idx ON public.bookings (lower(email));
CREATE INDEX IF NOT EXISTS bookings_tour_status_idx ON public.bookings (tour_status);

-- Reference generator for new bookings
CREATE OR REPLACE FUNCTION public.bookings_set_reference()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE yr text; n integer;
BEGIN
  IF NEW.booking_reference IS NULL THEN
    yr := to_char(coalesce(NEW.created_at, now()), 'YYYY');
    SELECT coalesce(max(substring(booking_reference from 9)::int), 0) + 1 INTO n
      FROM public.bookings WHERE booking_reference LIKE 'TT-' || yr || '-%';
    NEW.booking_reference := 'TT-' || yr || '-' || lpad(n::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER bookings_set_reference BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_set_reference();

-- 4. Payment ledger
CREATE TABLE IF NOT EXISTS public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  direction text NOT NULL DEFAULT 'payment',
  method text NOT NULL DEFAULT 'manual',
  reference text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_payments TO authenticated;
GRANT ALL ON public.booking_payments TO service_role;

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_payments staff read" ON public.booking_payments
  FOR SELECT USING (authz.has_min_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "booking_payments manager insert" ON public.booking_payments
  FOR INSERT WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "booking_payments manager update" ON public.booking_payments
  FOR UPDATE USING (authz.has_min_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "booking_payments manager delete" ON public.booking_payments
  FOR DELETE USING (authz.has_min_role(auth.uid(), 'manager'::app_role));

CREATE INDEX IF NOT EXISTS booking_payments_booking_idx ON public.booking_payments (booking_id);
CREATE UNIQUE INDEX IF NOT EXISTS booking_payments_order_uniq ON public.booking_payments (order_id) WHERE order_id IS NOT NULL;

-- Import already-collected online payments from the existing order records
INSERT INTO public.booking_payments (booking_id, amount_cents, method, reference, order_id, paid_at, notes)
SELECT o.booking_id, o.amount_total, o.provider, coalesce(o.stripe_payment_intent_id, o.stripe_session_id), o.id, o.created_at, 'Imported from online payment record'
FROM public.orders o
WHERE o.booking_id IS NOT NULL AND o.payment_status = 'paid';

-- 5. Admin audit log
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  actor_email text,
  entity text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  summary text,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_audit_log staff read" ON public.admin_audit_log
  FOR SELECT USING (authz.has_min_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "admin_audit_log staff insert" ON public.admin_audit_log
  FOR INSERT WITH CHECK (authz.has_min_role(auth.uid(), 'staff'::app_role));

CREATE INDEX IF NOT EXISTS admin_audit_log_entity_idx ON public.admin_audit_log (entity, entity_id, created_at DESC);