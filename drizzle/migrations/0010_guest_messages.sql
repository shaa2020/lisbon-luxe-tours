CREATE TABLE public.guest_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  label text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_message_templates TO authenticated;
GRANT ALL ON public.guest_message_templates TO service_role;
ALTER TABLE public.guest_message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gmt staff read" ON public.guest_message_templates FOR SELECT TO authenticated USING (authz.has_min_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "gmt admin write" ON public.guest_message_templates FOR ALL TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER gmt_updated BEFORE UPDATE ON public.guest_message_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.guest_message_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  sent_by uuid DEFAULT auth.uid(),
  sent_by_email text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX guest_message_log_booking_idx ON public.guest_message_log(booking_id, sent_at DESC);
GRANT SELECT, INSERT ON public.guest_message_log TO authenticated;
GRANT ALL ON public.guest_message_log TO service_role;
ALTER TABLE public.guest_message_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gml staff read" ON public.guest_message_log FOR SELECT TO authenticated USING (authz.has_min_role(auth.uid(), 'staff'::app_role));
CREATE POLICY "gml staff insert" ON public.guest_message_log FOR INSERT TO authenticated WITH CHECK (authz.has_min_role(auth.uid(), 'staff'::app_role) AND sent_by = auth.uid());

INSERT INTO public.guest_message_templates (key, language, label, body, sort_order) VALUES
('reminder','en','Tomorrow reminder','Hi {guest_name}! Looking forward to your {tour} tomorrow at {time}. Meeting point: {meeting_point} {map_link}. Your guide is {guide_name} ({guide_phone}). {balance_line}See you soon! Tuk Tuk 24',1),
('on_the_way','en','Guide on the way','Hi {guest_name}, your guide {guide_name} is on the way to {meeting_point} for your {time} tour. Call or message {guide_phone} if you need anything.',2),
('arrived','en','Driver is here','Hi {guest_name}, your tuk tuk has arrived at {meeting_point} {map_link}. {guide_name} is waiting for you!',3),
('running_late','en','Running 10 min late','Hi {guest_name}, so sorry, Lisbon traffic! Your guide {guide_name} is running about 10 minutes late. Thanks for your patience.',4),
('weather','en','Weather alert','Hi {guest_name}, the forecast for your {tour} on {date} looks rainy. Our tuk tuks have covers so the tour can go ahead, or we can move you to another date for free. Just reply and let us know!',5),
('thank_you','en','Thank you + review','Hi {guest_name}, thank you for riding with Tuk Tuk 24! If you enjoyed your {tour}, a quick review would mean the world to us: {review_link}',6);