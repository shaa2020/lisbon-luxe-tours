GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "profiles read own or owner" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_min_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles owner manage" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_min_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "profiles insert self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());