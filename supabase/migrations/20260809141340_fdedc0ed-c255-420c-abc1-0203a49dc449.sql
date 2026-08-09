UPDATE public.payment_gateways SET is_active = (provider = 'stripe'), updated_at = now();
UPDATE public.site_settings SET payment_provider = 'stripe', payments_enabled = true WHERE id = true;