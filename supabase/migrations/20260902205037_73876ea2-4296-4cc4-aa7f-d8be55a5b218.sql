ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS exit_popup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exit_popup_headline text,
  ADD COLUMN IF NOT EXISTS exit_popup_subtext text,
  ADD COLUMN IF NOT EXISTS exit_popup_code text,
  ADD COLUMN IF NOT EXISTS exit_popup_cta_label text;