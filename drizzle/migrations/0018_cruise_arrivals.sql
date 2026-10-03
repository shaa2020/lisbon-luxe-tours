CREATE TABLE public.cruise_arrivals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_name text NOT NULL,
  cruise_line text,
  passengers integer,
  arrival_date date NOT NULL,
  arrival_time text,
  departure_date date,
  departure_time text,
  terminal text,
  notes text,
  source text NOT NULL DEFAULT 'manual',
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ship_name, arrival_date)
);
GRANT ALL ON public.cruise_arrivals TO service_role;
ALTER TABLE public.cruise_arrivals ENABLE ROW LEVEL SECURITY;
CREATE INDEX cruise_arrivals_date_idx ON public.cruise_arrivals (arrival_date);
CREATE TRIGGER cruise_arrivals_updated_at BEFORE UPDATE ON public.cruise_arrivals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();