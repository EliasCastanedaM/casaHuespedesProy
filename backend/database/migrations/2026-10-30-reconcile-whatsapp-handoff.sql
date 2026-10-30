-- Contextos antiguos: se liberó la atención humana pero el asistente
-- conservó estado "handoff", generando preguntas repetidas y fechas antiguas.
-- Solo liberar borradores sin aprobación comercial, conservando los campos.
BEGIN;
UPDATE public.ai_conversations AS a
SET booking_context = jsonb_set(
      a.booking_context,
      '{whatsapp_mvp}',
      (a.booking_context->'whatsapp_mvp' - 'awaiting') || '{"state":"browsing"}'::jsonb,
      false
    ),
    updated_at = CURRENT_TIMESTAMP
FROM public.meta_conversations AS m
WHERE a.channel = 'whatsapp'
  AND m.channel = a.channel
  AND m.external_user_id = a.external_user_id
  AND m.handoff_active = false
  AND a.booking_context->'whatsapp_mvp'->>'state' = 'handoff'
  AND NOT (a.booking_context->'whatsapp_mvp' ? 'staff_confirmation');
COMMIT;
