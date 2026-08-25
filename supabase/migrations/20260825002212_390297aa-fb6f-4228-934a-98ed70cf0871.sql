-- OPS CUSTOMERS
CREATE TABLE public.ops_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text,
  email text,
  country text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_customers TO authenticated;
GRANT ALL ON public.ops_customers TO service_role;
ALTER TABLE public.ops_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_customers" ON public.ops_customers FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_customers BEFORE UPDATE ON public.ops_customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ops_customers_name_idx ON public.ops_customers (lower(name));

-- OPS TOURS
CREATE TABLE public.ops_tours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_description text,
  full_description text,
  duration_hours numeric NOT NULL DEFAULT 1.5,
  base_price numeric NOT NULL DEFAULT 0,
  max_guests int NOT NULL DEFAULT 6,
  vehicle_type text NOT NULL DEFAULT 'Private Tuk Tuk',
  included text[] NOT NULL DEFAULT '{}',
  excluded text[] NOT NULL DEFAULT '{}',
  pickup_available boolean NOT NULL DEFAULT true,
  image_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_tours TO authenticated;
GRANT ALL ON public.ops_tours TO service_role;
ALTER TABLE public.ops_tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_tours" ON public.ops_tours FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_tours BEFORE UPDATE ON public.ops_tours FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS STAFF
CREATE TABLE public.ops_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  whatsapp text,
  role text NOT NULL DEFAULT 'Driver',
  languages text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_staff TO authenticated;
GRANT ALL ON public.ops_staff TO service_role;
ALTER TABLE public.ops_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_staff" ON public.ops_staff FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_staff BEFORE UPDATE ON public.ops_staff FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS VEHICLES
CREATE TABLE public.ops_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  vehicle_type text NOT NULL DEFAULT 'Private Tuk Tuk',
  capacity int NOT NULL DEFAULT 6,
  driver_id uuid REFERENCES public.ops_staff(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_vehicles TO authenticated;
GRANT ALL ON public.ops_vehicles TO service_role;
ALTER TABLE public.ops_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_vehicles" ON public.ops_vehicles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_vehicles BEFORE UPDATE ON public.ops_vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS PARTNERS
CREATE TABLE public.ops_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_person text,
  email text,
  whatsapp text,
  commission_percent numeric NOT NULL DEFAULT 0,
  partner_type text NOT NULL DEFAULT 'Hotel',
  status text NOT NULL DEFAULT 'Active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_partners TO authenticated;
GRANT ALL ON public.ops_partners TO service_role;
ALTER TABLE public.ops_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_partners" ON public.ops_partners FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_partners BEFORE UPDATE ON public.ops_partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS BOOKINGS (JOBS)
CREATE TABLE public.ops_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  source_booking_id uuid UNIQUE REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.ops_customers(id) ON DELETE SET NULL,
  tour_id uuid REFERENCES public.ops_tours(id) ON DELETE SET NULL,
  tour_name text NOT NULL,
  tour_date date NOT NULL,
  start_time time NOT NULL DEFAULT '10:00',
  duration_hours numeric NOT NULL DEFAULT 1.5,
  adults int NOT NULL DEFAULT 1,
  children int NOT NULL DEFAULT 0,
  guests int NOT NULL DEFAULT 1,
  vehicle_qty int NOT NULL DEFAULT 1,
  vehicle_type text NOT NULL DEFAULT 'Private Tuk Tuk',
  pickup_location text,
  dropoff_location text,
  guide_id uuid REFERENCES public.ops_staff(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.ops_staff(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.ops_vehicles(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.ops_partners(id) ON DELETE SET NULL,
  base_price numeric NOT NULL DEFAULT 0,
  vehicle_charges numeric NOT NULL DEFAULT 0,
  extra_charges numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  deposit_required numeric NOT NULL DEFAULT 0,
  deposit_paid numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'Pending',
  payment_status text NOT NULL DEFAULT 'Unpaid',
  payment_method text,
  special_requests text,
  internal_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_bookings_date_idx ON public.ops_bookings (tour_date);
CREATE INDEX ops_bookings_status_idx ON public.ops_bookings (status);
CREATE INDEX ops_bookings_customer_idx ON public.ops_bookings (customer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_bookings TO authenticated;
GRANT ALL ON public.ops_bookings TO service_role;
ALTER TABLE public.ops_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_bookings" ON public.ops_bookings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_bookings BEFORE UPDATE ON public.ops_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS PAYMENTS
CREATE TABLE public.ops_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.ops_bookings(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  method text NOT NULL DEFAULT 'Cash',
  paid_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_payments_booking_idx ON public.ops_payments (booking_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_payments TO authenticated;
GRANT ALL ON public.ops_payments TO service_role;
ALTER TABLE public.ops_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_payments" ON public.ops_payments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- OPS ACTIVITY LOG
CREATE TABLE public.ops_booking_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.ops_bookings(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ops_activities_booking_idx ON public.ops_booking_activities (booking_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_booking_activities TO authenticated;
GRANT ALL ON public.ops_booking_activities TO service_role;
ALTER TABLE public.ops_booking_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_activities" ON public.ops_booking_activities FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- OPS CHANGE REQUESTS
CREATE TABLE public.ops_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.ops_bookings(id) ON DELETE CASCADE,
  request_type text NOT NULL DEFAULT 'Change',
  message text NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_change_requests TO authenticated;
GRANT ALL ON public.ops_change_requests TO service_role;
ALTER TABLE public.ops_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_change_requests" ON public.ops_change_requests FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_change_requests BEFORE UPDATE ON public.ops_change_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- OPS SETTINGS
CREATE TABLE public.ops_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  currency text NOT NULL DEFAULT 'EUR',
  deposit_percent numeric NOT NULL DEFAULT 20,
  default_start_time time NOT NULL DEFAULT '10:00',
  default_duration_hours numeric NOT NULL DEFAULT 1.5,
  business_name text NOT NULL DEFAULT 'Tuk Tuk 24',
  business_phone text,
  business_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ops_settings TO authenticated;
GRANT ALL ON public.ops_settings TO service_role;
ALTER TABLE public.ops_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ops_settings" ON public.ops_settings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER t_ops_settings BEFORE UPDATE ON public.ops_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.ops_settings (id) VALUES (true) ON CONFLICT DO NOTHING;