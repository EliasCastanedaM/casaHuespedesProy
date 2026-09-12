-- Casa Huéspedes Pimentel
-- Estado de derivación humana para WhatsApp, Instagram y Messenger.
-- Migración aditiva, idempotente y no destructiva.

BEGIN;

CREATE TABLE IF NOT EXISTS meta_conversations (
  channel VARCHAR(30) NOT NULL,
  external_user_id VARCHAR(160) NOT NULL,
  handoff_active BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_requested_at TIMESTAMPTZ,
  handoff_resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel, external_user_id),
  CHECK (channel IN ('whatsapp', 'instagram', 'facebook'))
);

CREATE INDEX IF NOT EXISTS idx_meta_conversations_active_handoff
ON meta_conversations(handoff_requested_at, updated_at)
WHERE handoff_active = TRUE;

-- La tabla fue introducida por la migración de producción del asesor.
-- Estas sentencias también permiten ejecutar esta migración de forma aislada.
CREATE TABLE IF NOT EXISTS ai_processed_messages (
  channel VARCHAR(30) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel, message_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_processed_messages_created_at
ON ai_processed_messages(created_at);

COMMIT;
