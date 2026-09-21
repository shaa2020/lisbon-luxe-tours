CREATE TABLE public.commission_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  percent NUMERIC NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX commission_rate_history_effective_from_idx
  ON public.commission_rate_history (effective_from DESC);

GRANT SELECT, INSERT ON public.commission_rate_history TO authenticated;
GRANT ALL ON public.commission_rate_history TO service_role;

ALTER TABLE public.commission_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read commission rate history"
  ON public.commission_rate_history
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'owner'::public.app_role) OR private.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.commission_rate_history (percent, effective_from)
SELECT COALESCE(commission_rate_percent, 20), TIMESTAMPTZ '1970-01-01'
FROM public.site_settings
WHERE id = true;