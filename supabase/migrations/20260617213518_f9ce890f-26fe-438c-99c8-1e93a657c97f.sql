
CREATE TABLE public.custom_tour_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('vehicle','destination','addon','duration')),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_tour_components TO anon, authenticated;
GRANT ALL ON public.custom_tour_components TO authenticated, service_role;

ALTER TABLE public.custom_tour_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active components"
  ON public.custom_tour_components FOR SELECT
  USING (active = true OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage components"
  ON public.custom_tour_components FOR ALL
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_custom_tour_components_updated_at
  BEFORE UPDATE ON public.custom_tour_components
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS custom_selections jsonb;

INSERT INTO public.custom_tour_components (category, name, description, price_cents, sort_order) VALUES
  ('vehicle', 'Electric Tuk-Tuk (up to 6)', 'Open-air, silent ride through Lisbon', 0, 1),
  ('vehicle', 'Mercedes V-Class SUV (up to 7)', 'Climate-controlled private chauffeur', 12000, 2),
  ('duration', '2 Hours', 'Quick city highlights', 8000, 1),
  ('duration', '4 Hours', 'Half-day exploration', 15000, 2),
  ('duration', 'Full Day (8h)', 'Comprehensive itinerary', 30000, 3),
  ('destination', 'Alfama Old Town', 'Fado quarter & miradouros', 0, 1),
  ('destination', 'Belém Monuments', 'Jerónimos, Belém Tower, pastéis', 2000, 2),
  ('destination', 'Sintra Palaces', 'Pena Palace & Quinta da Regaleira', 5000, 3),
  ('destination', 'Cabo da Roca', 'Westernmost point of Europe', 4000, 4),
  ('destination', 'Cascais Coast', 'Estoril & seaside village', 3000, 5),
  ('addon', 'Professional Photographer', '1 hour of photos at top stops', 9000, 1),
  ('addon', 'Wine & Pastry Tasting', 'Local wines & pastéis de nata', 3500, 2),
  ('addon', 'English-Speaking Guide', 'Dedicated local historian', 6000, 3),
  ('addon', 'Child Seat', 'Per child', 500, 4),
  ('addon', 'Hotel Pick-up & Drop-off', 'Door-to-door service', 1500, 5);
