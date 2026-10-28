-- Coexistencia Meta: archivo durable de eventos firmados de la app de WhatsApp.
-- Ejecutar ANTES de activar history, smb_app_state_sync, smb_message_echoes.
-- El historial y contactos se conservan sin ejecución automática de IA.
-- Revisar consentimiento, acceso, retención y purga antes de producción.
BEGIN;

CREATE TABLE IF NOT EXISTS public.meta_coexistence_events (
  event_id CHAR(64) PRIMARY KEY,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('history', 'smb_app_state_sync', 'smb_message_echoes')),
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meta_coexistence_events_received
  ON public.meta_coexistence_events(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_coexistence_events_type
  ON public.meta_coexistence_events(event_type, received_at DESC);

-- Tablas operativas del backend; las peticiones públicas no deben leer
-- datos de historial/contactos sincronizados desde la app.
ALTER TABLE public.meta_coexistence_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.meta_coexistence_events FROM anon, authenticated;
COMMIT;
