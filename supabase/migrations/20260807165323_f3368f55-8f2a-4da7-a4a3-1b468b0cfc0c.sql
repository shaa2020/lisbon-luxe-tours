CREATE TABLE public.subscribers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.subscribers TO authenticated;
GRANT INSERT ON public.subscribers TO anon, authenticated;
GRANT ALL ON public.subscribers TO service_role;

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe" ON public.subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Admins can view subscribers" ON public.subscribers FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete subscribers" ON public.subscribers FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX idx_subscribers_email ON public.subscribers USING btree (lower(email));