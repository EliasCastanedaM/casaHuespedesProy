-- Casa Huéspedes Pimentel
-- Historial durable de mensajes Meta y recuperación después de reinicios.
-- Migración aditiva, idempotente y no destructiva.

BEGIN;

CREATE TABLE IF NOT EXISTS meta_messages (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(30) NOT NULL,
  external_user_id VARCHAR(160) NOT NULL,
  meta_message_id VARCHAR(255),
  direction VARCHAR(20) NOT NULL,
  author VARCHAR(20) NOT NULL,
  message_type VARCHAR(40) NOT NULL DEFAULT 'text',
  content TEXT NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  error_detail TEXT,
  meta_timestamp TIMESTAMPTZ,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_meta_messages_conversation
    FOREIGN KEY (channel, external_user_id)
    REFERENCES meta_conversations(channel, external_user_id)
    ON DELETE CASCADE,
  CONSTRAINT chk_meta_messages_channel
    CHECK (channel IN ('whatsapp', 'instagram', 'facebook')),
  CONSTRAINT chk_meta_messages_direction
    CHECK (direction IN ('incoming', 'outgoing')),
  CONSTRAINT chk_meta_messages_author
    CHECK (author IN ('client', 'assistant', 'admin', 'system')),
  CONSTRAINT chk_meta_messages_status
    CHECK (status IN ('pending', 'processing', 'sent', 'received', 'failed')),
  CONSTRAINT chk_meta_messages_attempts
    CHECK (processing_attempts >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_messages_channel_message_id
ON meta_messages(channel, meta_message_id)
WHERE meta_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_messages_conversation_time
ON meta_messages(channel, external_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_meta_messages_recovery
ON meta_messages(status, last_attempt_at, created_at)
WHERE direction = 'incoming' AND status IN ('pending', 'processing', 'failed');

COMMIT;
