REVOKE EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) TO service_role;
REVOKE SELECT (author_email) ON public.reviews FROM anon, authenticated;