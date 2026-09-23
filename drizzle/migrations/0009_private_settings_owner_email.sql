CREATE TABLE IF NOT EXISTS public.private_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  owner_notification_email TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.private_settings TO authenticated;
GRANT ALL ON public.private_settings TO service_role;

ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read private settings"
  ON public.private_settings FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners write private settings"
  ON public.private_settings FOR ALL TO authenticated
  USING (authz.has_min_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'owner'::public.app_role));

INSERT INTO public.private_settings (id, owner_notification_email)
SELECT true, s.owner_notification_email FROM public.site_settings s WHERE s.id = true
ON CONFLICT (id) DO NOTHING;

COMMENT ON COLUMN public.site_settings.owner_notification_email IS 'DEPRECATED: moved to public.private_settings.owner_notification_email (site_settings is publicly readable).';