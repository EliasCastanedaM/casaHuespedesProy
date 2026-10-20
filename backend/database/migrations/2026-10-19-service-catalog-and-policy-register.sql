-- Catálogo común Casa Huéspedes: servicios públicos y reglas comerciales.
-- Fuentes: Inventario Maestro, Reglas Comerciales 2026-10, web propia y Booking.
-- No modifica precio, habitación, reserva, pago ni bloqueos.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS requires_coordination boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS services_slug_unique
  ON public.services (slug) WHERE slug IS NOT NULL;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.services FROM PUBLIC, anon, authenticated;

-- "publicly_listed" significa publicado en Booking / web, no necesariamente
-- validación operativa por el propietario. Nunca inferir costo si no figura.
INSERT INTO public.services (
  slug,name,description,price_type,price,is_active,
  source_kind,source_url,verification_status,requires_coordination,display_order
) VALUES
 ('wifi','WiFi gratuito','Acceso a WiFi gratuito en el alojamiento.','included',0,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es.html','publicly_listed',false,1),
 ('cocina-compartida','Cocina compartida','Área de cocina compartida para huéspedes. Su uso está sujeto a las condiciones del hospedaje.','not_specified',NULL,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es.html','publicly_listed',false,2),
 ('terraza','Terraza','Terraza y espacios al aire libre disponibles en el alojamiento. Las vistas pueden variar según la habitación.','not_specified',NULL,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es.html','publicly_listed',false,3),
 ('salon-compartido','Salón compartido','Espacio compartido para descansar durante la estadía.','not_specified',NULL,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es.html','publicly_listed',false,4),
 ('limpieza-diaria','Limpieza diaria','Servicio diario de limpieza indicado en la ficha pública del alojamiento.','not_specified',NULL,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.html','publicly_listed',false,5),
 ('lavanderia','Lavandería y planchado','Servicio adicional sujeto a disponibilidad y coordinación previa. La tarifa debe confirmarla el equipo.','on_request',NULL,true,
  'internal_website','https://www.casahuespedespimentel.com/servicios','publicly_listed',true,6),
 ('orientacion-turistica','Información turística','Orientación sobre lugares y actividades cercanas a Pimentel y Lambayeque.','not_specified',NULL,true,
  'booking','https://www.booking.com/hotel/pe/casa-huespedes-pimentel.es-mx.html','publicly_listed',false,7),
 ('estacionamiento','Orientación para estacionamiento','Orientación sobre estacionamiento cercano, previa coordinación. No implica estacionamiento propio garantizado.','on_request',NULL,true,
  'internal_website','https://www.casahuespedespimentel.com/','publicly_listed',true,8),
 ('taxi','Apoyo para coordinar taxi','Apoyo para coordinar movilidad local; servicio sujeto a disponibilidad y tarifas del proveedor.','on_request',NULL,true,
  'internal_website','https://www.casahuespedespimentel.com/','publicly_listed',true,9)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;

CREATE TABLE IF NOT EXISTS public.hotel_policy_rules (
  code varchar(80) PRIMARY KEY,
  title text NOT NULL,
  rule_category varchar(30) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status varchar(20) NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review','verified','retired')),
  active boolean NOT NULL DEFAULT true,
  requires_human_approval boolean NOT NULL DEFAULT false,
  source_document text,
  valid_from date,
  valid_until date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);
ALTER TABLE public.hotel_policy_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hotel_policy_rules FROM PUBLIC, anon, authenticated;

-- "verified" = aparece inequívocamente en el inventario/regras entregadas,
-- no implica aprobar cambios automáticos. Reglas que necesitan fechas,
-- periodicidad o monto final se mantienen PENDING_REVIEW.
INSERT INTO public.hotel_policy_rules
  (code,title,rule_category,config,review_status,active,requires_human_approval,source_document)
VALUES
 ('tarifa_full','Tarifa Full e IGV','rates',
  '{"vat_included":true,"breakfast_included":false,"currency":"PEN","authoritative_price_field":"room_categories.price_per_night"}'::jsonb,
  'verified',true,false,'Inventario Maestro - captura octubre 2026'),
 ('rango_anual','Rango dinámico anual','rates',
  '{"lower_percent":-30,"upper_percent":50,"suggestions_only":true,"automatic_price_changes":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('reduccion_ocupacion','Tarifa por ocupación incompleta','rates',
  '{"subtract_pen_per_missing_guest":20,"base_price_is_full_occupancy":true,"requires_approval_below_minimum":true,"apply_automatically":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('tarifa_minima','Precio mínimo','rates',
  '{"can_sell_below_minimum_if_admin_approves":true,"apply_automatically":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('ninos_0_4','Niños de 0 a 4 años','guests',
  '{"min_age":0,"max_age":4,"no_charge_when_using_existing_beds":true,"extra_bed_automatic":false}'::jsonb,
  'verified',true,false,'Reglas Comerciales - octubre 2026'),
 ('ninos_5_8','Niños de 5 a 8 años','guests',
  '{"min_age":5,"max_age":8,"percent_of_min_max_differential":50,"automatic_final_quote":false}'::jsonb,
  'verified',true,true,'Reglas Comerciales - octubre 2026'),
 ('ninos_9_mas','Niños de 9 años en adelante','guests',
  '{"min_age":9,"adult_rate_confirmed":false,"quote_requires_manual_review":true}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('mascotas','Mascotas','pets',
  '{"amount_pen":20,"vat_included":true,"charge_frequency":null,"approval_required":true,"automatic_final_quote":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('grupos_8','Grupos desde 8 huéspedes','guests',
  '{"min_total_guests":8,"special_rate_possible":true,"automatic_discount":false}'::jsonb,
  'verified',true,true,'Reglas Comerciales - octubre 2026'),
 ('temporada_alta','Temporada alta','rates',
  '{"requires_calendar_preload":true,"auto_apply":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('estadia_min_feriado_finsemana','Estadía mínima feriado cercano al fin de semana','stays',
  '{"nights":3,"requires_calendar_validation":true,"auto_apply":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('estadia_min_feriado_suelto','Estadía mínima feriado no cercano al fin de semana','stays',
  '{"nights":2,"requires_calendar_validation":true,"auto_apply":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('adelanto_temporada_alta','Adelanto temporada alta','payments',
  '{"deposit_percent":50,"requires_high_season_date":true,"auto_charge":false}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('revenue_ia','Recomendación de tarifas por IA','rates',
  '{"cadence":"weekly","suggestions_only":true,"human_approval_required":true,"planning_months_ahead":4}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('asignacion_por_capacidad','Asignación por capacidad','inventory',
  '{"prefer_smallest_sufficient_capacity":true,"exceptions_require_approval":true}'::jsonb,
  'verified',true,true,'Reglas Comerciales - octubre 2026'),
 ('edificios','Ubicación por edificio','inventory',
  '{"room_number_does_not_determine_floor":true,"room_407_floor":2,"building_mapping_pending":true}'::jsonb,
  'pending_review',true,true,'Reglas Comerciales - octubre 2026'),
 ('marketing_aprobacion','Aprobación de contenido','marketing',
  '{"ai_suggests":true,"human_approves":true}'::jsonb,
  'verified',true,true,'Cliente - Verificación humana'),
 ('booking_horario','Horarios de ingreso y salida publicados en Booking','stays',
  '{"check_in_from":"14:00","check_in_until":"22:00","check_out_from":"11:30","check_out_until":"12:00","platform_specific":true}'::jsonb,
  'pending_review',true,false,'Booking.com ficha pública'),
 ('descanso','Descanso nocturno publicado en Booking','house',
  '{"quiet_from":"23:00","quiet_until":"08:00","no_parties":true,"no_smoking":true}'::jsonb,
  'verified',true,false,'Booking.com ficha pública')
ON CONFLICT (code) DO NOTHING;
