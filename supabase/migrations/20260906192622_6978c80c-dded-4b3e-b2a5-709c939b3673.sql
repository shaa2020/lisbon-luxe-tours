CREATE TABLE public.ai_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  topic text NOT NULL,
  primary_keyword text,
  word_count integer,
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.ai_generation_log TO authenticated;
GRANT ALL ON public.ai_generation_log TO service_role;

ALTER TABLE public.ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Content team can view AI log"
  ON public.ai_generation_log FOR SELECT TO authenticated
  USING (authz.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE POLICY "Content team can add AI log entries"
  ON public.ai_generation_log FOR INSERT TO authenticated
  WITH CHECK (authz.has_min_role(auth.uid(), 'staff'::public.app_role));

CREATE INDEX ai_generation_log_created_idx ON public.ai_generation_log (created_at DESC);