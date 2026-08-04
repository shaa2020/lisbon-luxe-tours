ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payments_maintenance_message text NOT NULL DEFAULT 'Online payments are temporarily unavailable while we update our booking system. Please send us your request and we will confirm by email or WhatsApp.';