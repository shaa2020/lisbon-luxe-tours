CREATE TABLE public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "faqs public read active" ON public.faqs
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "faqs admin read all" ON public.faqs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "faqs admin insert" ON public.faqs
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "faqs admin update" ON public.faqs
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "faqs admin delete" ON public.faqs
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER faqs_set_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.faqs (question, answer, sort_order) VALUES
('How do I book a tuk-tuk tour in Lisbon?', 'You can book directly through any tour page, by using our Build Your Tour designer, on WhatsApp, or by contacting us. We reply within four hours.', 10),
('Are your tuk-tuks electric?', 'Yes — our entire fleet is 100% electric, silent, and emission-free. Perfect for Lisbon''s historic neighbourhoods like Alfama and Graça.', 20),
('How many people fit in one tuk-tuk?', 'Each tuk-tuk seats up to 6 passengers comfortably. For larger groups we operate a fleet of luxury Mercedes vans for up to 16 guests.', 30),
('Do you offer hotel pick-up?', 'Yes, hotel pick-up and drop-off in central Lisbon is included on every tour at no extra cost.', 40),
('What is your cancellation policy?', 'Free cancellation up to 24 hours before the tour. For full refunds within 24 hours, please contact us — we will accommodate genuine emergencies.', 50),
('Do you operate in the rain?', 'Yes. Our tuk-tuks are fully enclosed with side curtains and rain protection. If weather is severe, we will offer to reschedule or refund.', 60),
('Are the tours private?', 'Every tour we run is 100% private — only your group, your guide, your itinerary. We never mix parties.', 70),
('Which languages do your guides speak?', 'Our guides are native or fluent in English, Portuguese, Spanish, French and Italian. Other languages on request.', 80),
('Can I customise a tour or build my own?', 'Absolutely. Use our Build Your Tour designer to pick the vehicle, duration, destinations and add-ons à la carte — you get a live total and can pay online or request a quote.', 90),
('Is tipping expected?', 'Tipping is appreciated but never expected. 10% of the tour price is a generous gesture if you enjoyed your experience.', 100),
('Do you accommodate accessibility needs?', 'Yes — please let us know in advance so we can pair you with the right vehicle and adjust the itinerary for step-free routes where possible.', 110),
('How far in advance should I book?', 'We recommend booking at least 48 hours ahead in peak season (April–October). For last-minute requests, WhatsApp is your fastest channel.', 120);