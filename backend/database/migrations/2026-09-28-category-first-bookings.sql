-- ============================================================
-- RESERVA POR CATEGORÍA - Casa Huéspedes Pimentel
-- El huésped elige una categoría. room_id queda como la unidad
-- física asignada internamente por el backend.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS category_slug VARCHAR(40),
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(10,2);

UPDATE public.bookings b
SET
  category_slug = COALESCE(b.category_slug, r.category_slug),
  unit_price = COALESCE(b.unit_price, rc.price_per_night, r.price_per_night)
FROM public.rooms r
LEFT JOIN public.room_categories rc
  ON rc.slug = r.category_slug
WHERE b.room_id = r.id
  AND (b.category_slug IS NULL OR b.unit_price IS NULL);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_category_slug_fkey'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_category_slug_fkey
      FOREIGN KEY (category_slug)
      REFERENCES public.room_categories(slug)
      ON UPDATE CASCADE
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_category_dates
ON public.bookings(category_slug, check_in, check_out)
WHERE status IN (
  'pending',
  'pending_payment',
  'payment_reported',
  'confirmed'
);

-- room_number es un dato únicamente operativo/interno.
UPDATE public.rooms
SET room_number = substring(name FROM '#([0-9]{3})')
WHERE room_number IS NULL
  AND name ~ '#[0-9]{3}';
