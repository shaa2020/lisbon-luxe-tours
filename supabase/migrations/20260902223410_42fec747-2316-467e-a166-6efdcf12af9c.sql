CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  design text NOT NULL DEFAULT 'classic_gold',
  placement text NOT NULL DEFAULT 'top',
  target text NOT NULL DEFAULT 'all',
  target_slug text,
  headline text NOT NULL DEFAULT '',
  subtext text,
  code text,
  cta_label text,
  cta_url text,
  image_url text,
  badge_text text,
  priority integer NOT NULL DEFAULT 0,
  dismiss_rule text NOT NULL DEFAULT 'session',
  dismiss_days integer NOT NULL DEFAULT 7,
  starts_at timestamptz,
  ends_at timestamptz,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled promotions"
  ON public.promotions FOR SELECT
  USING (enabled = true);

CREATE POLICY "Staff can read all promotions"
  ON public.promotions FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Managers can manage promotions"
  ON public.promotions FOR ALL TO authenticated
  USING (authz.has_min_role(auth.uid(), 'manager'::app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::app_role));

CREATE TRIGGER promotions_updated
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX promotions_active_idx ON public.promotions (enabled, placement, priority DESC);

CREATE TABLE public.promotion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.promotion_events TO anon;
GRANT SELECT, INSERT ON public.promotion_events TO authenticated;
GRANT ALL ON public.promotion_events TO service_role;

ALTER TABLE public.promotion_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record promotion events"
  ON public.promotion_events FOR INSERT
  WITH CHECK (kind IN ('impression','code_copy','cta_click'));

CREATE POLICY "Staff can read promotion events"
  ON public.promotion_events FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::app_role));

CREATE INDEX promotion_events_promo_idx ON public.promotion_events (promotion_id, kind);

INSERT INTO public.promotions (name, design, placement, target, headline, subtext, code, cta_label, cta_url, priority, dismiss_rule, starts_at, ends_at, enabled)
SELECT
  'Main banner',
  CASE s.promo_banner_theme WHEN 'ink' THEN 'ink_night' WHEN 'sunset' THEN 'sunset_gradient' ELSE 'classic_gold' END,
  'top', 'all',
  COALESCE(NULLIF(trim(s.promo_banner_headline), ''), 'Book direct and save'),
  NULLIF(trim(COALESCE(s.promo_banner_subtext, '')), ''),
  NULLIF(trim(COALESCE(s.promo_banner_code, '')), ''),
  NULLIF(trim(COALESCE(s.promo_banner_cta_label, '')), ''),
  NULLIF(trim(COALESCE(s.promo_banner_cta_url, '')), ''),
  100, 'session', s.promo_banner_starts_at, s.promo_banner_ends_at, s.promo_banner_enabled
FROM public.site_settings s WHERE s.id = true;

INSERT INTO public.promotions (name, design, placement, target, headline, code, priority, dismiss_rule, enabled)
SELECT
  'Offer strip',
  'minimal_rule', 'bottom', 'all',
  COALESCE(NULLIF(trim(s.offer_bar_text), ''), 'Book direct and save'),
  NULLIF(trim(COALESCE(s.offer_bar_code, '')), ''),
  50, 'forever', s.offer_bar_enabled
FROM public.site_settings s WHERE s.id = true;