-- Habitación 406 se incorpora temporalmente a la categoría Triple.
-- Los triggers de categoría sincronizan capacidad, precio e inventario total.

UPDATE public.rooms
SET
  category_slug = 'triple',
  updated_at = CURRENT_TIMESTAMP
WHERE room_number = '406';
