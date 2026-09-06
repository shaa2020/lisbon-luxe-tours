CREATE TABLE public.tour_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL DEFAULT 60,
  duration_label text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0,
  sale_price numeric(10,2),
  short_description text,
  badge text NOT NULL DEFAULT 'none',
  is_recommended boolean NOT NULL DEFAULT false,
  is_best_value boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  included jsonb NOT NULL DEFAULT '[]'::jsonb,
  not_included jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tour_options_price_nonneg CHECK (price >= 0),
  CONSTRAINT tour_options_sale_nonneg CHECK (sale_price IS NULL OR sale_price >= 0),
  CONSTRAINT tour_options_minutes_positive CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
  CONSTRAINT tour_options_badge_valid CHECK (badge IN ('none','most_popular','best_value','recommended'))
);

CREATE INDEX tour_options_tour_idx ON public.tour_options (tour_id, sort_order);

GRANT SELECT ON public.tour_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tour_options TO authenticated;
GRANT ALL ON public.tour_options TO service_role;

ALTER TABLE public.tour_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tour options public read"
  ON public.tour_options FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    OR (auth.uid() IS NOT NULL AND private.has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "tour options admin write"
  ON public.tour_options FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER tour_options_updated
  BEFORE UPDATE ON public.tour_options
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS tour_option_id uuid REFERENCES public.tour_options(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS option_label text,
  ADD COLUMN IF NOT EXISTS option_duration_label text,
  ADD COLUMN IF NOT EXISTS option_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS option_base_price_cents integer,
  ADD COLUMN IF NOT EXISTS option_sale_price_cents integer,
  ADD COLUMN IF NOT EXISTS option_price_cents integer;