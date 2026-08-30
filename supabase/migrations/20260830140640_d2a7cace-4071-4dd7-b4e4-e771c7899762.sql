-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- rank helper
CREATE OR REPLACE FUNCTION public.role_rank(_role public.app_role)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _role
    WHEN 'owner' THEN 30
    WHEN 'admin' THEN 30
    WHEN 'manager' THEN 20
    WHEN 'staff' THEN 10
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND public.role_rank(ur.role) >= public.role_rank(_role)
  )
$$;

REVOKE ALL ON FUNCTION public.has_min_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.role_rank(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_rank(public.app_role) TO authenticated, service_role;

-- profiles policies
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_min_role(auth.uid(), 'staff'));

DROP POLICY IF EXISTS "profiles self upsert" ON public.profiles;
CREATE POLICY "profiles self upsert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_min_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "profiles update" ON public.profiles;
CREATE POLICY "profiles update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_min_role(auth.uid(), 'owner'))
  WITH CHECK (id = auth.uid() OR public.has_min_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "profiles owner delete" ON public.profiles;
CREATE POLICY "profiles owner delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'));

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- backfill profiles for existing users
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- user_roles: owners manage roles, everyone signed-in can read team roles
DROP POLICY IF EXISTS "user_roles owner manage" ON public.user_roles;
CREATE POLICY "user_roles owner manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_min_role(auth.uid(), 'owner'));
