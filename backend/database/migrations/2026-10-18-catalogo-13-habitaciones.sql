-- Catálogo aprobado el 18/10/2026 (13 habitaciones, 6 categorías).
-- Repetible: no elimina reservas, imágenes ni bloqueos existentes.
-- La habitación 406 queda inactiva y sin categoría comercial.
-- Familiar 2 conserva la distribución de camas documentada previamente
-- en la ficha interna de la unidad 405, pendiente de reconfirmación.
BEGIN;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.rooms WHERE room_number IN
    ('205','305','101','304','505','201','301','202','302','303','407','203','405')) <> 13
  THEN RAISE EXCEPTION 'Inventario físico inesperado; revisión manual requerida'; END IF;
END $$;

WITH nuevos(slug, name, capacity, beds, detail, amount, position) AS (
  VALUES
    ('matrimonial', 'Matrimonial Estándar', 2, '1 cama de 2 plazas',
      'Habitación para 2 huéspedes, cama de 2 plazas y vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.', 120::numeric, 1),
    ('matrimonial-ejecutiva', 'Matrimonial Ejecutiva', 2, '1 cama de 2 plazas',
      'Habitación para 2 huéspedes, cama de 2 plazas. La unidad 505 tiene vista al mar desde segunda fila; las demás tienen vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.', 140::numeric, 2),
    ('doble', 'Doble - 2 Camas', 2, '2 camas de 1½ plazas',
      'Habitación para 2 huéspedes con camas separadas y vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.', 140::numeric, 3),
    ('triple', 'Triple - 3 Camas', 3, '3 camas de 1½ plazas',
      'Habitación para 3 huéspedes con tres camas y vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.', 210::numeric, 4),
    ('familiar', 'Familiar 1', 5, '2 camas de 2 plazas + 3 camas de 1½ plazas',
      'Habitación Familiar 1, hasta 5 huéspedes, segundo piso y vista interior. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.', 250::numeric, 5)
)
UPDATE public.room_categories rc SET
  name = n.name,
  capacity = n.capacity,
  bed_description = n.beds,
  description = n.detail,
  price_low = n.amount,
  price_medium = n.amount,
  price_high = n.amount,
  price_per_night = n.amount,
  display_order = n.position,
  image_url = CASE WHEN n.slug = 'familiar'
    THEN COALESCE((SELECT ri.image_url FROM public.room_images ri
      JOIN public.rooms r ON r.id = ri.room_id
      WHERE r.room_number='203'
      ORDER BY ri.is_main DESC, ri.display_order, ri.id LIMIT 1), rc.image_url)
    ELSE rc.image_url END,
  is_active = TRUE,
  updated_at = CURRENT_TIMESTAMP
FROM nuevos n WHERE rc.slug=n.slug;

INSERT INTO public.room_categories
  (slug, name, total_quantity, capacity, bed_description, description,
   price_low, price_medium, price_high, price_per_night, image_url, display_order, is_active)
SELECT
  'familiar-2', 'Familiar 2', 0, 5,
  '1 cama de 2 plazas + 3 camas de 1½ plazas',
  'Habitación Familiar 2 para hasta 5 huéspedes, cuarto piso, acceso directo a terraza y vista al mar. Temporada normal, tarifa Full con IGV incluido. Desayuno no incluido.',
  250, 250, 250, 250,
  COALESCE(
    (SELECT ri.image_url FROM public.room_images ri
      WHERE ri.room_id=r.id ORDER BY ri.is_main DESC, ri.display_order, ri.id LIMIT 1),
    r.main_image_url),
  6, TRUE
FROM public.rooms r WHERE r.room_number='405'
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, capacity=EXCLUDED.capacity,
  bed_description=EXCLUDED.bed_description, description=EXCLUDED.description,
  price_low=EXCLUDED.price_low, price_medium=EXCLUDED.price_medium,
  price_high=EXCLUDED.price_high, price_per_night=EXCLUDED.price_per_night,
  image_url=EXCLUDED.image_url, display_order=EXCLUDED.display_order,
  is_active=EXCLUDED.is_active, updated_at=CURRENT_TIMESTAMP;

WITH mapping(room_number, slug, floor_no, vista) AS (
 VALUES
 ('205','matrimonial',2,'Vista interior'),
 ('305','matrimonial',3,'Vista interior'),
 ('101','matrimonial-ejecutiva',1,'Vista interior'),
 ('304','matrimonial-ejecutiva',3,'Vista interior'),
 ('505','matrimonial-ejecutiva',5,'Vista al mar desde segunda fila'),
 ('201','doble',2,'Vista interior'),
 ('301','doble',3,'Vista interior'),
 ('202','triple',2,'Vista interior'),
 ('302','triple',3,'Vista interior'),
 ('303','triple',3,'Vista interior'),
 ('407','triple',2,'Vista interior'),
 ('203','familiar',2,'Vista interior'),
 ('405','familiar-2',4,'Acceso directo a terraza y vista al mar')
)
UPDATE public.rooms r SET
  category_slug=m.slug,
  capacity=rc.capacity,
  price_per_night=rc.price_per_night,
  room_type=rc.name,
  bed_type=rc.bed_description,
  floor_number=m.floor_no,
  floor_label='Piso ' || m.floor_no,
  view_type=m.vista,
  name=CASE r.room_number
    WHEN '203' THEN 'Habitación Familiar 1 #203'
    WHEN '405' THEN 'Habitación Familiar 2 #405'
    ELSE r.name END,
  description=CASE r.room_number
    WHEN '203' THEN 'Habitación Familiar 1 en el segundo piso, hasta 5 huéspedes. Dos camas de 2 plazas y tres camas de plaza y media, baño privado y vista interior.'
    WHEN '405' THEN 'Habitación Familiar 2 en el cuarto piso, hasta 5 huéspedes. Acceso directo a terraza y vista al mar. Una cama de 2 plazas y tres camas de plaza y media, baño privado.'
    WHEN '505' THEN 'Habitación matrimonial ejecutiva ubicada en el quinto piso, para 2 huéspedes, con cama de 2 plazas, baño privado y vista al mar desde segunda fila.'
    ELSE r.description END,
  status='active',
  updated_at=CURRENT_TIMESTAMP
FROM mapping m JOIN public.room_categories rc ON rc.slug=m.slug
WHERE r.room_number=m.room_number;

-- La unidad 406 no figura en la relación oficial de 13 habitaciones.
-- Se conserva su registro, material gráfico y posibilidad de reactivarla.
UPDATE public.rooms SET
  category_slug=NULL,
  status='inactive',
  price_per_night=197.20,
  updated_at=CURRENT_TIMESTAMP
WHERE room_number='406';

UPDATE public.room_categories rc SET
  total_quantity=(SELECT count(*)::int FROM public.rooms r
    WHERE r.category_slug=rc.slug AND r.status='active'),
  updated_at=CURRENT_TIMESTAMP
WHERE rc.slug IN ('matrimonial','matrimonial-ejecutiva','doble','triple','familiar','familiar-2');

DO $$
BEGIN
  IF (SELECT count(*) FROM public.rooms WHERE status='active') <> 13
   OR (SELECT count(*) FROM public.room_categories WHERE is_active) <> 6
   OR (SELECT total_quantity FROM public.room_categories WHERE slug='triple') <> 4
   OR (SELECT total_quantity FROM public.room_categories WHERE slug='familiar') <> 1
   OR (SELECT total_quantity FROM public.room_categories WHERE slug='familiar-2') <> 1
  THEN RAISE EXCEPTION 'Validación del catálogo fallida; se revierte la transacción'; END IF;
END $$;
COMMIT;
