ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS commission_rate_percent numeric NOT NULL DEFAULT 20;

ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS guide_id uuid REFERENCES public.ops_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_rate_percent numeric,
  ADD COLUMN IF NOT EXISTS commission_cents integer;

CREATE INDEX IF NOT EXISTS booking_payments_guide_idx ON public.booking_payments (guide_id);

CREATE TABLE IF NOT EXISTS public.guide_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.ops_staff(id) ON DELETE CASCADE,
  direction text NOT NULL DEFAULT 'payout',
  amount_cents integer NOT NULL,
  note text,
  settled_at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guide_settlements TO authenticated;
GRANT ALL ON public.guide_settlements TO service_role;

ALTER TABLE public.guide_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read settlements" ON public.guide_settlements
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners write settlements" ON public.guide_settlements
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'owner'::app_role) OR private.has_role(auth.uid(), 'admin'::app_role));