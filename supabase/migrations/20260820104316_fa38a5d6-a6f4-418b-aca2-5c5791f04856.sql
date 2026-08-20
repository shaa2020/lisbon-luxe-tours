ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS author_photo_url text;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  value integer NOT NULL DEFAULT 10,
  min_guests integer NOT NULL DEFAULT 1,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discount_codes TO anon;
GRANT SELECT ON public.discount_codes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active discount codes"
  ON public.discount_codes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage discount codes"
  ON public.discount_codes FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER discount_codes_updated
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.discount_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  code text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.discount_redemptions TO authenticated;
GRANT ALL ON public.discount_redemptions TO service_role;

ALTER TABLE public.discount_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read discount redemptions"
  ON public.discount_redemptions FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS offer_bar_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_bar_text text NOT NULL DEFAULT 'Book direct and save',
  ADD COLUMN IF NOT EXISTS offer_bar_code text,
  ADD COLUMN IF NOT EXISTS whatsapp_reply_line text NOT NULL DEFAULT 'We usually reply within minutes',
  ADD COLUMN IF NOT EXISTS google_review_url text;