ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS travel_time text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS daily_slot_capacity integer NOT NULL DEFAULT 3;
CREATE INDEX IF NOT EXISTS bookings_travel_date_idx ON public.bookings (travel_date);
