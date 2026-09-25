ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS tip_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'tour';
CREATE INDEX IF NOT EXISTS orders_kind_idx ON public.orders (kind);
COMMENT ON COLUMN public.orders.kind IS 'tour = tour fare payment, tip = optional guest gratuity (never counted towards the booking balance or commission)';
COMMENT ON COLUMN public.bookings.tip_cents IS 'Sum of confirmed guest gratuities for this booking, kept separate from the tour fare.';