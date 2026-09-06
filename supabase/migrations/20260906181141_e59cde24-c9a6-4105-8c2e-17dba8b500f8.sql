ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS primary_keyword text,
  ADD COLUMN IF NOT EXISTS secondary_keywords text[],
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS primary_keyword text,
  ADD COLUMN IF NOT EXISTS secondary_keywords text[],
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS og_image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  heading text,
  intro text,
  body_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_tour_slugs text[] NOT NULL DEFAULT '{}',
  image_url text,
  image_alt text,
  seo_title text,
  meta_description text,
  primary_keyword text,
  secondary_keywords text[],
  canonical_url text,
  og_image_url text,
  noindex boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.destinations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.destinations TO authenticated;
GRANT ALL ON public.destinations TO service_role;

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published destinations are public" ON public.destinations;
CREATE POLICY "Published destinations are public"
  ON public.destinations FOR SELECT
  USING (published = true);

DROP POLICY IF EXISTS "Staff can read all destinations" ON public.destinations;
CREATE POLICY "Staff can read all destinations"
  ON public.destinations FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::public.app_role));

DROP POLICY IF EXISTS "Managers can write destinations" ON public.destinations;
CREATE POLICY "Managers can write destinations"
  ON public.destinations FOR ALL TO authenticated
  USING (authz.has_min_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::public.app_role));

CREATE INDEX IF NOT EXISTS destinations_published_idx ON public.destinations (published, sort_order);

DROP TRIGGER IF EXISTS update_destinations_updated_at ON public.destinations;
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  intent text NOT NULL DEFAULT 'informational',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'not_started',
  target_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seo_keywords_intent_chk CHECK (intent IN ('informational','commercial','transactional','local')),
  CONSTRAINT seo_keywords_priority_chk CHECK (priority IN ('low','medium','high')),
  CONSTRAINT seo_keywords_status_chk CHECK (status IN ('not_started','planned','draft_created','published','optimized'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keywords TO authenticated;
GRANT ALL ON public.seo_keywords TO service_role;

ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read keywords" ON public.seo_keywords;
CREATE POLICY "Staff can read keywords"
  ON public.seo_keywords FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::public.app_role));

DROP POLICY IF EXISTS "Managers can write keywords" ON public.seo_keywords;
CREATE POLICY "Managers can write keywords"
  ON public.seo_keywords FOR ALL TO authenticated
  USING (authz.has_min_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::public.app_role));

DROP TRIGGER IF EXISTS update_seo_keywords_updated_at ON public.seo_keywords;
CREATE TRIGGER update_seo_keywords_updated_at
  BEFORE UPDATE ON public.seo_keywords
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.business_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_knowledge TO authenticated;
GRANT ALL ON public.business_knowledge TO service_role;

ALTER TABLE public.business_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read business knowledge" ON public.business_knowledge;
CREATE POLICY "Staff can read business knowledge"
  ON public.business_knowledge FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::public.app_role));

DROP POLICY IF EXISTS "Managers can write business knowledge" ON public.business_knowledge;
CREATE POLICY "Managers can write business knowledge"
  ON public.business_knowledge FOR ALL TO authenticated
  USING (authz.has_min_role(auth.uid(), 'manager'::public.app_role))
  WITH CHECK (authz.has_min_role(auth.uid(), 'manager'::public.app_role));

DROP TRIGGER IF EXISTS update_business_knowledge_updated_at ON public.business_knowledge;
CREATE TRIGGER update_business_knowledge_updated_at
  BEFORE UPDATE ON public.business_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
