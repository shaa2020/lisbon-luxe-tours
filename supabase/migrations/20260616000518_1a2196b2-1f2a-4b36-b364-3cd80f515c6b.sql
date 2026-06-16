-- Reviews system: customers submit reviews per tour; admins moderate (approve/hide).
-- Public sees only approved reviews. Anonymous submissions allowed but defaulted to pending.

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id uuid REFERENCES public.tours(id) ON DELETE CASCADE,
  tour_slug text,
  author_name text NOT NULL,
  author_email text,
  rating integer NOT NULL,
  title text,
  body text NOT NULL,
  travel_date date,
  status text NOT NULL DEFAULT 'pending',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Validation trigger (no CHECK on time-dependent things; rating bounds + status enum done here for consistency)
CREATE OR REPLACE FUNCTION public.validate_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  IF NEW.status NOT IN ('pending','approved','hidden') THEN
    RAISE EXCEPTION 'status must be pending, approved, or hidden';
  END IF;
  IF length(trim(NEW.author_name)) = 0 THEN
    RAISE EXCEPTION 'author_name required';
  END IF;
  IF length(trim(NEW.body)) < 5 THEN
    RAISE EXCEPTION 'review body too short';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_validate
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review();

CREATE TRIGGER reviews_updated
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX reviews_tour_status_idx ON public.reviews(tour_id, status);
CREATE INDEX reviews_slug_status_idx ON public.reviews(tour_slug, status);
CREATE INDEX reviews_featured_idx ON public.reviews(featured) WHERE featured = true;

-- Grants: public can read approved reviews (anon + authenticated SELECT),
-- anon can INSERT (submission), only admins can UPDATE/DELETE (moderation).
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Public read: only approved reviews; admins see everything
CREATE POLICY "reviews public read approved"
  ON public.reviews FOR SELECT
  USING (
    status = 'approved'
    OR (auth.role() = 'authenticated' AND private.has_role(auth.uid(), 'admin'::app_role))
  );

-- Anyone (including anon) can submit a review, but it lands as 'pending'
CREATE POLICY "reviews public submit"
  ON public.reviews FOR INSERT
  WITH CHECK (status = 'pending' AND featured = false);

-- Admin moderation
CREATE POLICY "reviews admin update"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "reviews admin delete"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));
