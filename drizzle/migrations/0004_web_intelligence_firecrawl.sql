-- Free-tier Firecrawl Web Intelligence

CREATE TABLE public.web_intel_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  monthly_credit_limit INTEGER NOT NULL DEFAULT 500,
  low_threshold_percent INTEGER NOT NULL DEFAULT 80,
  paid_usage_enabled BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.web_intel_settings TO authenticated;
GRANT ALL ON public.web_intel_settings TO service_role;
ALTER TABLE public.web_intel_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read web intel settings" ON public.web_intel_settings
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'staff'::public.app_role)
      OR private.has_role(auth.uid(), 'manager'::public.app_role)
      OR private.has_role(auth.uid(), 'owner'::public.app_role)
      OR private.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.web_intel_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.research_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  mode TEXT,
  query TEXT NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'completed',
  credits_used INTEGER NOT NULL DEFAULT 0,
  searches INTEGER NOT NULL DEFAULT 0,
  pages INTEGER NOT NULL DEFAULT 0,
  leads_found INTEGER NOT NULL DEFAULT 0,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  error TEXT,
  actor UUID,
  actor_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX research_jobs_created_at_idx ON public.research_jobs (created_at DESC);
GRANT SELECT ON public.research_jobs TO authenticated;
GRANT ALL ON public.research_jobs TO service_role;
ALTER TABLE public.research_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read research jobs" ON public.research_jobs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'staff'::public.app_role)
      OR private.has_role(auth.uid(), 'manager'::public.app_role)
      OR private.has_role(auth.uid(), 'owner'::public.app_role)
      OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.research_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.research_jobs(id) ON DELETE SET NULL,
  company TEXT NOT NULL,
  country TEXT,
  city TEXT,
  website TEXT,
  domain TEXT,
  business_type TEXT,
  tourism_focus TEXT,
  portugal_relevance TEXT,
  lisbon_relevance TEXT,
  email TEXT,
  phone TEXT,
  contact_page TEXT,
  source_url TEXT,
  reason TEXT,
  relevance_score INTEGER,
  status TEXT NOT NULL DEFAULT 'new',
  crm_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX research_leads_status_idx ON public.research_leads (status, created_at DESC);
CREATE INDEX research_leads_domain_idx ON public.research_leads (domain);
GRANT SELECT ON public.research_leads TO authenticated;
GRANT ALL ON public.research_leads TO service_role;
ALTER TABLE public.research_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read research leads" ON public.research_leads
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'staff'::public.app_role)
      OR private.has_role(auth.uid(), 'manager'::public.app_role)
      OR private.has_role(auth.uid(), 'owner'::public.app_role)
      OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.firecrawl_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.research_jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  credits INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX firecrawl_usage_log_created_at_idx ON public.firecrawl_usage_log (created_at DESC);
GRANT SELECT ON public.firecrawl_usage_log TO authenticated;
GRANT ALL ON public.firecrawl_usage_log TO service_role;
ALTER TABLE public.firecrawl_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read firecrawl usage" ON public.firecrawl_usage_log
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'staff'::public.app_role)
      OR private.has_role(auth.uid(), 'manager'::public.app_role)
      OR private.has_role(auth.uid(), 'owner'::public.app_role)
      OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- Additive B2B fields on the existing CRM (leads)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS relevance_reason TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_kind TEXT NOT NULL DEFAULT 'customer';

CREATE INDEX IF NOT EXISTS leads_domain_idx ON public.leads (domain);
CREATE INDEX IF NOT EXISTS leads_lead_kind_idx ON public.leads (lead_kind);