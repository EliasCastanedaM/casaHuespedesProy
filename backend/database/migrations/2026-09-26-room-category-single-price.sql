-- Precio único vigente por categoría.
-- Se conservan las columnas históricas de temporada para no destruir datos,
-- pero la web, la IA y las reservas usan únicamente price_per_night.

ALTER TABLE public.room_categories
  ADD COLUMN IF NOT EXISTS price_per_night NUMERIC(10,2);

UPDATE public.room_categories
SET
  price_per_night = CASE slug
    WHEN 'matrimonial' THEN 155
    WHEN 'doble' THEN 140
    WHEN 'triple' THEN 170
    WHEN 'familiar' THEN 220
    ELSE price_per_night
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('matrimonial', 'doble', 'triple', 'familiar');

UPDATE public.rooms
SET
  price_per_night = CASE category_slug
    WHEN 'matrimonial' THEN 155
    WHEN 'doble' THEN 140
    WHEN 'triple' THEN 170
    WHEN 'familiar' THEN 220
    ELSE price_per_night
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE category_slug IN ('matrimonial', 'doble', 'triple', 'familiar');
