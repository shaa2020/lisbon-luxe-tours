ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS footer_tagline text,
  ADD COLUMN IF NOT EXISTS footer_legal text;

UPDATE public.site_settings SET
  contact_email = COALESCE(contact_email, 'hello@tuktuk24.pt'),
  contact_phone = COALESCE(contact_phone, '+351 922 024 690'),
  whatsapp_phone = COALESCE(whatsapp_phone, '+351922024690'),
  address_line1 = COALESCE(address_line1, 'Largo da Graça 12'),
  address_line2 = COALESCE(address_line2, '1100-265 Lisboa, Portugal'),
  city = COALESCE(city, 'Lisboa'),
  country = COALESCE(country, 'Portugal'),
  instagram_url = COALESCE(instagram_url, 'https://instagram.com'),
  facebook_url = COALESCE(facebook_url, 'https://facebook.com'),
  twitter_url = COALESCE(twitter_url, 'https://twitter.com'),
  footer_legal = COALESCE(footer_legal, 'RNAAT 1042 · NIF 514 832 109')
WHERE id = true;

DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'iamshanto7860@gmail.com';
  IF uid IS NULL THEN
    uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      uid, '00000000-0000-0000-0000-000000000000', 'iamshanto7860@gmail.com',
      crypt('78607860', gen_salt('bf')), now(),
      'authenticated', 'authenticated',
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', 'iamshanto7860@gmail.com', 'email_verified', true),
      'email', uid::text, now(), now(), now());
  ELSE
    UPDATE auth.users
       SET encrypted_password = crypt('78607860', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = uid;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;
END $$;