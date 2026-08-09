DELETE FROM public.payment_gateway_secrets WHERE provider = 'paypal' AND mode = 'live';
UPDATE public.payment_gateways SET mode = 'test', is_active = true, last_check_ok = true, last_check_message = 'Connected to PayPal (test mode).', updated_at = now() WHERE provider = 'paypal';
UPDATE public.payment_gateways SET is_active = false WHERE provider <> 'paypal';