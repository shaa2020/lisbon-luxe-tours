-- Convert group prices (which covered 2 guests) to per-person rates
UPDATE public.tours
SET price_from = GREATEST(1, ROUND(price_from / 2.0)::int),
    sale_price = CASE WHEN sale_price IS NULL THEN NULL ELSE GREATEST(1, ROUND(sale_price / 2.0)::int) END;

UPDATE public.custom_tour_components
SET price_cents = GREATEST(0, ROUND(price_cents / 2.0)::int),
    extra_per_guest_cents = 0;