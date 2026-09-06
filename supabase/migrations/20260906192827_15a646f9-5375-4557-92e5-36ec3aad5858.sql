GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_knowledge TO authenticated;
GRANT ALL ON public.business_knowledge TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='business_knowledge' AND policyname='Staff can manage business knowledge') THEN
    CREATE POLICY "Staff can manage business knowledge"
      ON public.business_knowledge FOR ALL TO authenticated
      USING (authz.has_min_role(auth.uid(), 'staff'::public.app_role))
      WITH CHECK (authz.has_min_role(auth.uid(), 'staff'::public.app_role));
  END IF;
END $$;