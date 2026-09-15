-- Persistencia durable y privada para el flujo de reserva directa del asesor.
-- Esta migración es aditiva, no elimina ni reescribe reservas existentes.

BEGIN;

ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS booking_intent_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'bookings_booking_intent_id_key'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_booking_intent_id_key
      UNIQUE (booking_intent_id);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.ai_conversations
  ALTER COLUMN last_response_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS booking_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_context_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_conversations_booking_context_is_object'
      AND conrelid = 'public.ai_conversations'::regclass
  ) THEN
    ALTER TABLE public.ai_conversations
      ADD CONSTRAINT ai_conversations_booking_context_is_object
      CHECK (jsonb_typeof(booking_context) = 'object');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_booking_context_expires_at
ON public.ai_conversations(booking_context_expires_at)
WHERE booking_context_expires_at IS NOT NULL;

ALTER TABLE IF EXISTS public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- El asesor usa una conexión PostgreSQL directa. La tabla no necesita acceso
-- desde REST/GraphQL, ni siquiera con service_role. No se crean policies.
REVOKE ALL ON TABLE public.ai_conversations
FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
