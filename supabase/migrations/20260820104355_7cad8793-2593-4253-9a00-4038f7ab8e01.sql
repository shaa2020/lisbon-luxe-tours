DROP VIEW IF EXISTS public.reviews_public;
CREATE VIEW public.reviews_public
WITH (security_invoker = true) AS
SELECT id,
    tour_id,
    tour_slug,
    author_name,
    rating,
    title,
    body,
    travel_date,
    status,
    featured,
    created_at,
    updated_at,
    source,
    source_url,
    author_photo_url
FROM public.reviews
WHERE status = 'approved'::text;
GRANT SELECT ON public.reviews_public TO anon, authenticated;
GRANT ALL ON public.reviews_public TO service_role;