ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS promo_banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promo_banner_headline text,
  ADD COLUMN IF NOT EXISTS promo_banner_subtext text,
  ADD COLUMN IF NOT EXISTS promo_banner_code text,
  ADD COLUMN IF NOT EXISTS promo_banner_cta_label text,
  ADD COLUMN IF NOT EXISTS promo_banner_cta_url text,
  ADD COLUMN IF NOT EXISTS promo_banner_theme text NOT NULL DEFAULT 'gold',
  ADD COLUMN IF NOT EXISTS promo_banner_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_banner_ends_at timestamptz;