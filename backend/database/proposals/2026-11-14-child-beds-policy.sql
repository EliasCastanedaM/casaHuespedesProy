-- PREPARED ONLY: do not execute until the production release is authorized.
-- Source: owner instruction and clarification, 14 November 2026.
-- Applies data changes only. No schema, room counts or adult rates are changed.
BEGIN;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.hotel_policy_rules
      WHERE code IN ('ninos_0_4','ninos_5_8','ninos_9_mas')) <> 3 THEN
    RAISE EXCEPTION 'Missing child policy rows; review before applying';
  END IF;
END;
$$;

UPDATE public.hotel_policy_rules
SET config = '{"min_age":0,"max_age":4,"no_charge_when_using_existing_beds":true,"extra_bed_automatic":false,"max_children_sharing_parent_bed":2,"parent_bed_types":["2","1.5"],"parents_share_one_half_bed_permitted":true,"child_policy_version":"children-2026-11-14-shared-parent-beds"}'::jsonb,
    review_status='verified', source_document='Instrucción y aclaración del propietario, 14/11/2026', updated_at=NOW()
WHERE code='ninos_0_4';

UPDATE public.hotel_policy_rules
SET config = '{"min_age":5,"max_age":8,"amount_pen":20,"charge_frequency":"child_per_night","automatic_final_quote":true,"availability_requires_human_review":true,"child_policy_version":"children-2026-11-14-shared-parent-beds"}'::jsonb,
    review_status='verified', source_document='Instrucción y aclaración del propietario, 14/11/2026', updated_at=NOW()
WHERE code='ninos_5_8';

UPDATE public.hotel_policy_rules
SET config = '{"min_age":9,"adult_rate_confirmed":true,"quote_requires_manual_review":false,"child_policy_version":"children-2026-11-14-shared-parent-beds"}'::jsonb,
    review_status='verified', source_document='Instrucción y aclaración del propietario, 14/11/2026', updated_at=NOW()
WHERE code='ninos_9_mas';

-- Match the bed types shown by the owner. The existing five-place capacity stays.
UPDATE public.room_categories
SET bed_description='1 cama de 2 plazas + 2 camas de 1½ plazas + 1 cama de 1 plaza', updated_at=NOW()
WHERE slug='familiar-2';
COMMIT;

-- Verify after the authorized release:
-- SELECT code, config, review_status FROM public.hotel_policy_rules
-- WHERE code IN ('ninos_0_4','ninos_5_8','ninos_9_mas');
-- SELECT slug, capacity, bed_description FROM public.room_categories;
