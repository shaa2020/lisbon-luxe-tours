CREATE TABLE public.booking_modifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('add_guests', 'extend_duration', 'admin_adjustment')),
  old_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  difference_cents integer NOT NULL DEFAULT 0,
  stripe_session_id text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'waived')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'applied', 'rejected')),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.booking_modifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_modifications TO authenticated;

ALTER TABLE public.booking_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage booking modifications"
ON public.booking_modifications
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER booking_modifications_updated
BEFORE UPDATE ON public.booking_modifications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();