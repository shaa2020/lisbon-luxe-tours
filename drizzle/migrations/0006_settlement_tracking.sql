ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS collected_by TEXT,
  ADD COLUMN IF NOT EXISTS settlement_kind TEXT NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.booking_payments.collected_by IS 'Free-text name of the person who collected the money (guide, office staff).';
COMMENT ON COLUMN public.booking_payments.settlement_kind IS 'manual = recorded by admin, balance = balance settlement, deposit = deposit.';

CREATE INDEX IF NOT EXISTS booking_payments_booking_idx ON public.booking_payments (booking_id, paid_at DESC);