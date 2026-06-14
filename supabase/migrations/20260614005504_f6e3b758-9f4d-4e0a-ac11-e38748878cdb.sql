
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_total integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'eur',
  payment_status text NOT NULL DEFAULT 'pending',
  customer_name text,
  customer_email text,
  tour_title text,
  tour_slug text,
  guests integer,
  travel_date date,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders admin read" ON public.orders FOR SELECT
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "orders admin update" ON public.orders FOR UPDATE
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "orders admin delete" ON public.orders FOR DELETE
  TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS amount_total integer;

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(payment_status);
