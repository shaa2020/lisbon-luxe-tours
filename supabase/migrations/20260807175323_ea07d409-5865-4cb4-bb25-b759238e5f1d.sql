CREATE TABLE public.payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  label text NOT NULL,
  installed boolean NOT NULL DEFAULT false,
  mode text NOT NULL DEFAULT 'test',
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  last_check_ok boolean,
  last_check_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateways TO authenticated;
GRANT ALL ON public.payment_gateways TO service_role;

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment gateways admin all"
ON public.payment_gateways FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER payment_gateways_updated
BEFORE UPDATE ON public.payment_gateways
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_gateways (provider, label, installed, mode, is_active, sort_order) VALUES
  ('stripe', 'Stripe', false, 'test', false, 1),
  ('mollie', 'Mollie', false, 'live', true, 2),
  ('paypal', 'PayPal', false, 'test', false, 3),
  ('manual', 'Manual / Off', true, 'live', false, 4);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'mollie';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'mollie';