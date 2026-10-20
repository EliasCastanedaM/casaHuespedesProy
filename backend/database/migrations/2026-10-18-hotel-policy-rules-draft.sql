-- OBSOLETO / NO EJECUTAR: este archivo fue un borrador de 18/10.
-- Sustituido por 2026-10-19-service-catalog-and-policy-register.sql,
-- aplicado a producción como hotel_service_catalog_commercial_rules_20261019.
-- Mantener solo como antecedente histórico; contiene supuestos que el
-- inventario maestro actual deja PENDIENTES (9+ años, cobro mascota/noche).
-- Propuesta (NO ejecutar hasta validar el documento completo con propietarios).
-- Separa reglas comerciales de tarifas de habitación ya registradas en room_categories.
-- No modifica inventario, reservas, bloqueos ni pagos.
BEGIN;

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

-- Las políticas administrativas no deben ser públicas vía REST.
ALTER TABLE public.hotel_policy_rules ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hotel_policy_rules FROM anon, authenticated;

INSERT INTO public.hotel_policy_rules
(code,title,rule_category,config,review_status,active,requires_human_approval,source_document)
VALUES
 ('children_0_4','Niños 0–4','guests',
  '{"min_age":0,"max_age":4,"no_additional_charge_if_existing_beds":true}'::jsonb,
  'pending_review',true,false,'WhatsApp MVP - Reglas clave'),
 ('children_5_8','Niños 5–8','guests',
  '{"min_age":5,"max_age":8,"discount_on_difference_percent":50,"calculation_ready":false,"reason":"Faltan tarifa mínima, tarifa máxima y criterio de aplicación"}'::jsonb,
  'pending_review',true,true,'WhatsApp MVP - Reglas clave'),
 ('children_9_plus','Desde 9 años','guests',
  '{"min_age":9,"adult_rate":true}'::jsonb,
  'pending_review',true,false,'WhatsApp MVP - Reglas clave'),
 ('pets','Mascotas','pets',
  '{"amount_pen":20,"per":"pet_per_night","prior_approval_required":true}'::jsonb,
  'pending_review',true,true,'WhatsApp MVP - Reglas clave'),
 ('large_groups','Grupos de 8 o más','guests',
  '{"min_total_guests":8,"possible_special_rate":true}'::jsonb,
  'pending_review',true,true,'WhatsApp MVP - Reglas clave'),
 ('whatsapp_mvp_booking','Reserva por WhatsApp MVP','booking',
  '{"automatic_confirm":false,"human_handoff_required":true,"activate_automation_after_pms_validation":true}'::jsonb,
  'pending_review',true,true,'Cliente - Verificación humana'),
 ('tariff_change_approval','Aprobación de tarifas','rates',
  '{"ai_suggests":true,"human_approves":true,"occupancy_based_suggestions":true,"high_season_lead_months":4}'::jsonb,
  'pending_review',true,true,'Cliente - Verificación humana'),
 ('marketing_content_approval','Aprobación de contenido','marketing',
  '{"ai_suggests":true,"human_approves":true}'::jsonb,
  'pending_review',true,true,'Cliente - Verificación humana')
ON CONFLICT (code) DO NOTHING;

COMMIT;
