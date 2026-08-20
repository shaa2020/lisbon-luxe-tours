ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS group_discount_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS group_discount_tiers jsonb NOT NULL DEFAULT '[{"min_guests":3,"percent":5},{"min_guests":5,"percent":10}]'::jsonb;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS per_person_pricing boolean NOT NULL DEFAULT true;

UPDATE public.tours SET per_person_pricing = false WHERE slug = 'airport-luxury-transfer';