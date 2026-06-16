CREATE OR REPLACE FUNCTION public.reviews_sanitize_public_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For non-admin submitters, never trust client-supplied author_email
  -- (unverified, allows impersonation). Force pending status.
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.author_email := NULL;
    NEW.status := 'pending';
    NEW.featured := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_sanitize_public_insert ON public.reviews;
CREATE TRIGGER reviews_sanitize_public_insert
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.reviews_sanitize_public_insert();