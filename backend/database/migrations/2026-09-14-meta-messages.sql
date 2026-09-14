-- Casa Huéspedes Pimentel
-- Historial durable de mensajes Meta, estados de entrega y recuperación segura.
-- Migración aditiva, idempotente y no destructiva.

BEGIN;

ALTER TABLE meta_conversations
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS meta_messages (
  id BIGSERIAL PRIMARY KEY,
  channel VARCHAR(30) NOT NULL,
  external_user_id VARCHAR(160) NOT NULL,
  meta_message_id VARCHAR(255),
  in_reply_to_message_id BIGINT,
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
  CONSTRAINT chk_meta_messages_attempts
    CHECK (processing_attempts >= 0)
);

ALTER TABLE meta_messages
  ADD COLUMN IF NOT EXISTS in_reply_to_message_id BIGINT;

ALTER TABLE meta_messages
  DROP CONSTRAINT IF EXISTS chk_meta_messages_status;

ALTER TABLE meta_messages
  ADD CONSTRAINT chk_meta_messages_status
  CHECK (status IN ('pending', 'processing', 'received', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE meta_messages
  DROP CONSTRAINT IF EXISTS fk_meta_messages_reply;

ALTER TABLE meta_messages
  ADD CONSTRAINT fk_meta_messages_reply
  FOREIGN KEY (in_reply_to_message_id)
  REFERENCES meta_messages(id)
  ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_messages_channel_message_id
ON meta_messages(channel, meta_message_id)
WHERE meta_message_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_meta_messages_assistant_reply
ON meta_messages(in_reply_to_message_id)
WHERE direction = 'outgoing'
  AND author = 'assistant'
  AND in_reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_messages_conversation_time
ON meta_messages(channel, external_user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_meta_messages_recovery
ON meta_messages(status, last_attempt_at, processing_attempts, created_at)
WHERE direction = 'incoming' AND status IN ('pending', 'processing', 'failed');

CREATE INDEX IF NOT EXISTS idx_meta_messages_reply
ON meta_messages(in_reply_to_message_id)
WHERE in_reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meta_conversations_last_message
ON meta_conversations(last_message_at DESC NULLS LAST, updated_at DESC);

COMMIT;
