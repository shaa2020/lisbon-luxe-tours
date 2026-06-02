UPDATE public.site_settings SET brand_name = 'Tuk Tuk 24', logo_url = NULL;
ALTER TABLE public.site_settings ALTER COLUMN brand_name SET DEFAULT 'Tuk Tuk 24';