-- 1) Trigger-only SECURITY DEFINER function should not be directly callable via the API
REVOKE EXECUTE ON FUNCTION public.bookings_set_reference() FROM PUBLIC, anon, authenticated;

-- 2) Public translations must follow the parent record's published state
DROP POLICY IF EXISTS "Anyone can read content translations" ON public.content_translations;

CREATE POLICY "Public can read translations of published content"
ON public.content_translations
FOR SELECT
TO anon, authenticated
USING (
  CASE table_name
    WHEN 'tours' THEN EXISTS (SELECT 1 FROM public.tours t WHERE t.id = record_id AND t.published = true)
    WHEN 'blog_posts' THEN EXISTS (SELECT 1 FROM public.blog_posts b WHERE b.id = record_id AND b.published = true)
    WHEN 'travel_guides' THEN EXISTS (SELECT 1 FROM public.travel_guides g WHERE g.id = record_id AND g.status = 'published')
    WHEN 'faqs' THEN EXISTS (SELECT 1 FROM public.faqs f WHERE f.id = record_id AND f.active = true)
    WHEN 'travel_categories' THEN EXISTS (SELECT 1 FROM public.travel_categories c WHERE c.id = record_id AND c.active = true)
    ELSE false
  END
);