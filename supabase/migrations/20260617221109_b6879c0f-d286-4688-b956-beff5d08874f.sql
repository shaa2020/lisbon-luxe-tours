ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS custom_tour_eyebrow text,
  ADD COLUMN IF NOT EXISTS custom_tour_title text,
  ADD COLUMN IF NOT EXISTS custom_tour_subtitle text;