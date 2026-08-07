CREATE OR REPLACE FUNCTION public.reviews_sanitize_public_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    NEW.author_email := NULL;
    NEW.status := 'pending';
    NEW.featured := false;
  END IF;
  RETURN NEW;
END;
$function$;