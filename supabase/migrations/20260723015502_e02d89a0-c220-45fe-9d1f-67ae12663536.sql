INSERT INTO public.faqs (question, answer, sort_order, active)
SELECT 'What is your cancellation policy?',
       'Free cancellation up to 24 hours before the tour — you get a full refund, no questions asked. Cancellations made less than 24 hours before the tour are non-refundable. Need to reschedule inside the 24-hour window? Message us on WhatsApp and we''ll do our best based on availability.',
       1,
       true
WHERE NOT EXISTS (
  SELECT 1 FROM public.faqs WHERE question ILIKE '%cancellation%'
);