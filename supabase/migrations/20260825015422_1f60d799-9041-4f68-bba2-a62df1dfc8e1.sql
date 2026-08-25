-- bookings extras
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS refund_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS auto_emails_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS auto_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_review_request_enabled boolean NOT NULL DEFAULT false;

-- booking timeline
CREATE TABLE IF NOT EXISTS public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  kind text NOT NULL,
  summary text NOT NULL,
  detail jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS booking_events_booking_idx ON public.booking_events(booking_id, created_at DESC);

GRANT SELECT, INSERT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read booking events" ON public.booking_events
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins add booking events" ON public.booking_events
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- editable email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text NOT NULL,
  heading text NOT NULL,
  intro text NOT NULL,
  outro text NOT NULL DEFAULT '',
  cta_label text,
  cta_url text,
  show_booking_details boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read email templates" ON public.email_templates
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage email templates" ON public.email_templates
  FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.email_templates (key, label, subject, heading, intro, outro, cta_label, cta_url, sort_order) VALUES
('booking_confirmation','Booking confirmation','Your Lisbon tour is confirmed — {{booking_ref}}','Your tour is confirmed','Hi {{customer_name}}, thanks for booking with us. Here are your tour details. We will message you on WhatsApp 24 hours before departure with your driver''s name and the exact pickup point.','Free cancellation up to 24 hours before the tour. Cancellations made less than 24 hours before are non-refundable; if you reschedule, refund eligibility is calculated from the original booked date and time.','Manage my booking','https://tuktuk24lisbon.com/booking/manage',1),
('payment_request','Payment request','Payment for your Lisbon tour — {{booking_ref}}','Complete your payment','Hi {{customer_name}}, here is the payment link for your tour. Your spot is held until payment is received.','If the link does not work, just reply to this email and we will help.','Pay now',NULL,2),
('tour_reminder','Tour reminder','See you tomorrow — {{tour}}','Your tour is tomorrow','Hi {{customer_name}}, we are looking forward to showing you Lisbon. Please be ready 5 minutes before the start time and wear comfortable shoes.','Any last-minute change? Just reply to this email or message us on WhatsApp.',NULL,NULL,3),
('booking_updated','Booking updated','Your booking has been updated — {{booking_ref}}','Your booking has been updated','Hi {{customer_name}}, we have updated your booking. Please check the details below and let us know if anything looks wrong.','','Manage my booking','https://tuktuk24lisbon.com/booking/manage',4),
('booking_cancelled','Cancellation confirmation','Your booking has been cancelled — {{booking_ref}}','Booking cancelled','Hi {{customer_name}}, your booking has been cancelled as requested. We are sorry we will not be showing you Lisbon this time.','Refunds follow our policy: free cancellation up to 24 hours before the tour; later cancellations are non-refundable, calculated from the original booked date and time.','Book another tour','https://tuktuk24lisbon.com/tours',5),
('refund_issued','Refund issued','Your refund is on its way — {{booking_ref}}','Refund issued','Hi {{customer_name}}, we have issued a refund of {{refund_amount}} for your booking. It usually reaches your account within 5 to 10 business days depending on your bank.','','',NULL,6),
('invoice','Invoice','Your invoice — {{booking_ref}}','Your invoice','Hi {{customer_name}}, thank you for travelling with us. Below is a summary of your booking and payment. Prices include VAT under the special tour-operator margin scheme.','If you need a formal PDF invoice, reply to this email and we will send it right over.',NULL,NULL,7),
('review_request','Review request','How was your Lisbon tour?','Thanks for riding with us','Hi {{customer_name}}, we hope you enjoyed your tour. If you have a minute, a short review helps our small local team enormously.','Thank you — it really makes a difference.','Leave a review',NULL,8),
('custom_message','Free-form message','A message about your booking — {{booking_ref}}','A quick note','Hi {{customer_name}},','',NULL,NULL,9)
ON CONFLICT (key) DO NOTHING;