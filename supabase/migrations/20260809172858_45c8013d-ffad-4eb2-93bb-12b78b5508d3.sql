UPDATE public.payment_gateway_secrets SET mode = 'test', updated_at = now() WHERE provider = 'paypal' AND mode = 'live';
UPDATE public.payment_gateways SET mode = 'test' WHERE provider = 'paypal';
UPDATE public.site_settings SET payment_provider = 'paypal' WHERE id = true;
UPDATE public.site_settings SET payments_enabled = true WHERE id = true;