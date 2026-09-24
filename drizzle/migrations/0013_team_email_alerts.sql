ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_alerts boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.email_alerts IS 'When true, this team member receives internal booking/payment alert emails.';