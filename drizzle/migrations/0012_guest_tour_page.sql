CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS guest_token text DEFAULT encode(extensions.gen_random_bytes(24),'hex');
UPDATE public.bookings SET guest_token = encode(extensions.gen_random_bytes(24),'hex') WHERE guest_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS bookings_guest_token_key ON public.bookings(guest_token);
ALTER TABLE public.ops_staff ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.ops_staff ADD COLUMN IF NOT EXISTS bio text;