-- =========================
-- Travel Guide CMS
-- =========================

CREATE TABLE public.travel_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  image_url text,
  seo_title text,
  meta_description text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.travel_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_categories TO authenticated;
GRANT ALL ON public.travel_categories TO service_role;
ALTER TABLE public.travel_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_categories public read" ON public.travel_categories
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "travel_categories admin all" ON public.travel_categories
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER travel_categories_updated BEFORE UPDATE ON public.travel_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.travel_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.travel_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_tags TO authenticated;
GRANT ALL ON public.travel_tags TO service_role;
ALTER TABLE public.travel_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_tags public read" ON public.travel_tags
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "travel_tags admin all" ON public.travel_tags
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER travel_tags_updated BEFORE UPDATE ON public.travel_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.travel_guides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category_id uuid REFERENCES public.travel_categories(id) ON DELETE SET NULL,
  excerpt text NOT NULL DEFAULT '',
  quick_answer text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  hero_image_url text,
  hero_image_alt text,
  hero_image_caption text,
  author text NOT NULL DEFAULT 'TukTuk24 Lisbon Team',
  reading_time integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  featured_order integer NOT NULL DEFAULT 0,
  locale text NOT NULL DEFAULT 'en',
  published_at timestamptz,
  content_updated_at timestamptz,
  seo_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  robots text NOT NULL DEFAULT 'index, follow',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travel_guides_status_idx ON public.travel_guides(status);
CREATE INDEX travel_guides_category_idx ON public.travel_guides(category_id);
GRANT SELECT ON public.travel_guides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guides TO authenticated;
GRANT ALL ON public.travel_guides TO service_role;
ALTER TABLE public.travel_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guides public read" ON public.travel_guides
  FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "travel_guides admin all" ON public.travel_guides
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER travel_guides_updated BEFORE UPDATE ON public.travel_guides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.travel_guide_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX travel_guide_faqs_guide_idx ON public.travel_guide_faqs(guide_id);
GRANT SELECT ON public.travel_guide_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guide_faqs TO authenticated;
GRANT ALL ON public.travel_guide_faqs TO service_role;
ALTER TABLE public.travel_guide_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guide_faqs public read" ON public.travel_guide_faqs
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_guides g WHERE g.id = guide_id AND g.status = 'published'));
CREATE POLICY "travel_guide_faqs admin all" ON public.travel_guide_faqs
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER travel_guide_faqs_updated BEFORE UPDATE ON public.travel_guide_faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.travel_guide_tags (
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.travel_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (guide_id, tag_id)
);
GRANT SELECT ON public.travel_guide_tags TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guide_tags TO authenticated;
GRANT ALL ON public.travel_guide_tags TO service_role;
ALTER TABLE public.travel_guide_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guide_tags public read" ON public.travel_guide_tags
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_guides g WHERE g.id = guide_id AND g.status = 'published'));
CREATE POLICY "travel_guide_tags admin all" ON public.travel_guide_tags
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.travel_guide_related_articles (
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  related_guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (guide_id, related_guide_id)
);
GRANT SELECT ON public.travel_guide_related_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guide_related_articles TO authenticated;
GRANT ALL ON public.travel_guide_related_articles TO service_role;
ALTER TABLE public.travel_guide_related_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guide_related_articles public read" ON public.travel_guide_related_articles
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_guides g WHERE g.id = guide_id AND g.status = 'published'));
CREATE POLICY "travel_guide_related_articles admin all" ON public.travel_guide_related_articles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.travel_guide_related_tours (
  guide_id uuid NOT NULL REFERENCES public.travel_guides(id) ON DELETE CASCADE,
  tour_id uuid NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (guide_id, tour_id)
);
GRANT SELECT ON public.travel_guide_related_tours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guide_related_tours TO authenticated;
GRANT ALL ON public.travel_guide_related_tours TO service_role;
ALTER TABLE public.travel_guide_related_tours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guide_related_tours public read" ON public.travel_guide_related_tours
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.travel_guides g WHERE g.id = guide_id AND g.status = 'published'));
CREATE POLICY "travel_guide_related_tours admin all" ON public.travel_guide_related_tours
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.travel_guide_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  redirect_type integer NOT NULL DEFAULT 301,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.travel_guide_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.travel_guide_redirects TO authenticated;
GRANT ALL ON public.travel_guide_redirects TO service_role;
ALTER TABLE public.travel_guide_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "travel_guide_redirects public read" ON public.travel_guide_redirects
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "travel_guide_redirects admin all" ON public.travel_guide_redirects
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER travel_guide_redirects_updated BEFORE UPDATE ON public.travel_guide_redirects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create a 301 when a guide slug changes, with loop protection
CREATE OR REPLACE FUNCTION public.travel_guides_slug_redirect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    DELETE FROM public.travel_guide_redirects
      WHERE from_path = '/lisbon-guide/' || NEW.slug;
    UPDATE public.travel_guide_redirects
      SET to_path = '/lisbon-guide/' || NEW.slug
      WHERE to_path = '/lisbon-guide/' || OLD.slug;
    INSERT INTO public.travel_guide_redirects (from_path, to_path, redirect_type)
      VALUES ('/lisbon-guide/' || OLD.slug, '/lisbon-guide/' || NEW.slug, 301)
      ON CONFLICT (from_path) DO UPDATE SET to_path = EXCLUDED.to_path;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER travel_guides_slug_redirect
  AFTER UPDATE OF slug ON public.travel_guides
  FOR EACH ROW EXECUTE FUNCTION public.travel_guides_slug_redirect();

INSERT INTO public.travel_categories (slug, name, description, sort_order) VALUES
  ('plan-your-trip', 'Plan Your Trip', 'Itineraries, timing and practical planning for a Lisbon visit.', 1),
  ('things-to-do', 'Things to Do', 'Neighbourhood guides, viewpoints and the best of Lisbon by day and night.', 2),
  ('travelers', 'Travelers', 'Advice for families, couples, seniors, groups and first-time visitors.', 3),
  ('day-trips', 'Day Trips', 'Sintra, Cascais, Cabo da Roca and other trips within reach of Lisbon.', 4),
  ('transport-practical', 'Transport & Practical', 'Getting around Lisbon, the airport, hills, and accessibility.', 5),
  ('travel-tips', 'Travel Tips', 'Local know-how that makes a Lisbon trip easier.', 6);