-- 1. Traveller (B2C) intent leads alongside partner (B2B) leads
ALTER TABLE public.research_leads
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'partner',
  ADD COLUMN IF NOT EXISTS request_summary TEXT,
  ADD COLUMN IF NOT EXISTS travel_dates TEXT,
  ADD COLUMN IF NOT EXISTS group_size TEXT,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS posted_at TEXT;

CREATE INDEX IF NOT EXISTS research_leads_audience_idx ON public.research_leads (audience);

-- 2. Security: never expose review author emails through the public row policy.
REVOKE SELECT ON public.reviews FROM anon, authenticated;
GRANT SELECT (id, tour_id, tour_slug, author_name, rating, title, body, travel_date,
              status, featured, created_at, updated_at, source, source_url, author_photo_url)
  ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;