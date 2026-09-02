CREATE SCHEMA IF NOT EXISTS authz;
REVOKE ALL ON SCHEMA authz FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA authz TO authenticated, service_role;
ALTER FUNCTION public.has_min_role(uuid, public.app_role) SET SCHEMA authz;
REVOKE ALL ON FUNCTION authz.has_min_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION authz.has_min_role(uuid, public.app_role) TO authenticated, service_role;