CREATE TABLE public.payment_gateway_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  mode text NOT NULL,
  secrets_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, mode)
);

GRANT ALL ON public.payment_gateway_secrets TO service_role;
ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER payment_gateway_secrets_updated
BEFORE UPDATE ON public.payment_gateway_secrets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();