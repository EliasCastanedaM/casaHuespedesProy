-- Referencia actual del hotel para el asesor global y el catálogo compartido.
-- Fuente: imágenes aportadas por el responsable el 2026-11-07.
-- No cambia tarifas numéricas, reservas, pagos ni disponibilidad.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
UPDATE public.hotel_profile
SET street_address='Calle Quiñonez 233', verification_status='verified',
    verified_source='Material del hotel aportado por el responsable, 2026-11-07', updated_at=now()
WHERE id=1;

UPDATE public.room_categories
SET description=replace(description,'Desayuno no incluido.','Desayuno continental incluido en la tarifa.'),updated_at=now()
WHERE description LIKE '%Desayuno no incluido.%';
UPDATE public.rooms
SET description=replace(description,'Desayuno no incluido.','Desayuno continental incluido en la tarifa.'),updated_at=now()
WHERE description LIKE '%Desayuno no incluido.%';
UPDATE public.hotel_policy_rules
SET config=config || '{"breakfast_included":true,"breakfast_type":"continental"}'::jsonb,
    source_document='Material actual del hotel, 2026-11-07',updated_at=now()
WHERE code='tarifa_full';

INSERT INTO public.services(slug,name,description,price_type,price,is_active,source_kind,source_url,verification_status,requires_coordination,display_order) VALUES
 ('wifi', 'WiFi gratuito', 'Conexión WiFi gratuita disponible en todo el establecimiento.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 1),
 ('bano-privado', 'Baño privado con agua caliente', 'Cada habitación cuenta con baño privado con agua caliente, toallas y papel higiénico.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 2),
 ('tv-netflix', 'TV y Netflix', 'Cada habitación cuenta con TV y Netflix.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 3),
 ('ventilador', 'Ventilador', 'Cada habitación cuenta con ventilador.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 4),
 ('desayuno-continental', 'Desayuno continental', 'Desayuno continental incluido en la tarifa de alojamiento.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 5),
 ('cocina-compartida', 'Cocina compartida', 'Cocina abierta y compartida para uso de los huéspedes.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 6),
 ('terraza', 'Terraza con vista al mar', 'Área común: terraza en el cuarto piso con vista al mar. El acceso a esta área no implica que todas las habitaciones tengan esa vista.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 7),
 ('salon-compartido', 'Zona de TV y salón compartido', 'Zona de TV y salón de uso compartido.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 8),
 ('exteriores', 'Mobiliario exterior y solárium', 'Mobiliario exterior, terraza y zona de solárium.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 9),
 ('lavanderia', 'Lavandería y planchado', 'Lavandería de pago. Planchado y limpieza en seco sujetos a coordinación; el equipo confirma condiciones y tarifas antes de contratar.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 10),
 ('limpieza-diaria', 'Limpieza diaria', 'Servicio de limpieza diaria del alojamiento.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 11),
 ('barbacoa', 'Barbacoa de pago', 'Uso de barbacoa de pago, previa coordinación. El equipo confirma disponibilidad y tarifa.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 12),
 ('traslado-aeropuerto', 'Traslado al aeropuerto de pago', 'Traslado al aeropuerto de pago, previa coordinación. El equipo confirma proveedor, disponibilidad y tarifa.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 13),
 ('comida-bebida', 'Comida y bebida', 'Cafetería, restaurante y snack-bar; opciones de fruta, botella de agua, bombones o galletas y menú para niños. El equipo confirma horarios, disponibilidad y el precio de cada consumo.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 14),
 ('menus-dieteticos', 'Menús dietéticos bajo petición', 'Menús dietéticos bajo petición y sujetos a coordinación. El equipo confirma disponibilidad y costo.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 15),
 ('seguridad', 'Seguridad en zonas comunes', 'Extintores y cámaras de seguridad fuera del alojamiento y en zonas comunitarias.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 16),
 ('recepcion', 'Recepción y factura', 'Se proporciona factura y registro de entrada y salida privado. El equipo confirma las condiciones del servicio.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 17),
 ('orientacion-turistica', 'Información turística', 'Orientación sobre lugares y actividades cercanas a Pimentel y Lambayeque.', 'included', 0, TRUE, 'owner_material', NULL, 'approved', FALSE, 18),
 ('playa-pediluvio', 'Playa cercana y pediluvio', 'Playa cercana y pediluvio. Consulta las condiciones de uso con el equipo.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 19),
 ('idiomas', 'Atención presencial en español', 'El personal atiende en español. Puedes escribir al asesor digital en el idioma que prefieras.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 20),
 ('habitaciones-familiares', 'Habitaciones familiares y para no fumadores', 'Hay categorías familiares y habitaciones para no fumadores. Está prohibido fumar en todo el alojamiento.', 'not_specified', NULL, TRUE, 'owner_material', NULL, 'approved', FALSE, 21),
 ('estacionamiento', 'Estacionamiento externo recomendado', 'El alojamiento no cuenta con estacionamiento propio. Se puede compartir una sugerencia de cochera de terceros, de pago y sujeta a disponibilidad.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 22),
 ('taxi', 'Taxi de terceros recomendado', 'Se puede compartir una sugerencia de taxi de terceros. El proveedor confirma tarifas y disponibilidad.', 'on_request', NULL, TRUE, 'owner_material', NULL, 'approved', TRUE, 23),
 ('mascotas', 'Mascotas con autorización previa', 'Se admiten mascotas bajo petición y autorización del hospedaje. Cargo de S/ 20 por mascota y por noche.', 'on_request', 20, TRUE, 'owner_material', NULL, 'approved', TRUE, 24)
ON CONFLICT(slug) WHERE slug IS NOT NULL DO UPDATE SET
 name=EXCLUDED.name,description=EXCLUDED.description,price_type=EXCLUDED.price_type,
 price=EXCLUDED.price,is_active=EXCLUDED.is_active,source_kind=EXCLUDED.source_kind,
 source_url=EXCLUDED.source_url,verification_status=EXCLUDED.verification_status,
 requires_coordination=EXCLUDED.requires_coordination,display_order=EXCLUDED.display_order,updated_at=now();

INSERT INTO public.hotel_policy_rules(code,title,rule_category,config,review_status,active,requires_human_approval,source_document) VALUES
 ('formas_pago', 'Formas de pago oficiales', 'payments', '{"methods": ["Efectivo", "Transferencia BCP", "Yape", "Plin", "Tarjetas Visa y Mastercard"], "bank": {"name": "BCP", "account_type": "Ahorros", "account_number": "30506479111043", "cci": "00230510647911104315"}, "yape": "997369352", "plin": "943030098", "cards": ["Visa", "Mastercard"], "manual_payment_requires_coordination": true, "automatic_payment_verification": false}'::jsonb, 'verified', TRUE, TRUE, 'Material del hotel aportado por el responsable del proyecto, 2026-11-07'),
 ('ubicacion_referencia', 'Dirección y referencia oficiales', 'location', '{"street_address": "Calle Quiñonez 233", "district": "Pimentel", "province": "Chiclayo", "region": "Lambayeque", "country": "Perú", "landmark": "A una cuadra del Muelle de Pimentel, en la paralela al primer malecón.", "maps_url": "https://maps.app.goo.gl/PfXxizCYj1YqeY9x7", "own_parking": false, "beachfront_confirmed": false}'::jsonb, 'verified', TRUE, FALSE, 'Material del hotel aportado por el responsable del proyecto, 2026-11-07'),
 ('ubicacion_frente_playa', 'Frente a la playa: contraste pendiente', 'location', '{"source_claim": "Situado frente a la playa", "publish_as_confirmed": false, "approved_reference": "A una cuadra del Muelle de Pimentel, en la paralela al primer malecón."}'::jsonb, 'pending_review', TRUE, TRUE, 'Material del hotel aportado por el responsable del proyecto, 2026-11-07')
ON CONFLICT(code) DO UPDATE SET title=EXCLUDED.title,rule_category=EXCLUDED.rule_category,
 config=EXCLUDED.config,review_status=EXCLUDED.review_status,active=EXCLUDED.active,
 requires_human_approval=EXCLUDED.requires_human_approval,source_document=EXCLUDED.source_document,updated_at=now();
