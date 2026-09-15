-- Casa Huéspedes Pimentel
-- Progreso durable de entrega por partes para mensajes salientes de Instagram.
-- Migración aditiva, idempotente y no destructiva.

BEGIN;

ALTER TABLE public.meta_messages
  ADD COLUMN IF NOT EXISTS delivery_part_count INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_next_part_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_part_message_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meta_messages'::regclass
      AND conname = 'chk_meta_messages_delivery_part_count'
  ) THEN
    ALTER TABLE public.meta_messages
      ADD CONSTRAINT chk_meta_messages_delivery_part_count
      CHECK (delivery_part_count IS NULL OR delivery_part_count >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meta_messages'::regclass
      AND conname = 'chk_meta_messages_delivery_next_part_index'
  ) THEN
    ALTER TABLE public.meta_messages
      ADD CONSTRAINT chk_meta_messages_delivery_next_part_index
      CHECK (
        delivery_next_part_index >= 0
        AND (
          delivery_part_count IS NULL
          OR delivery_next_part_index <= delivery_part_count
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meta_messages'::regclass
      AND conname = 'chk_meta_messages_delivery_part_message_ids'
  ) THEN
    ALTER TABLE public.meta_messages
      ADD CONSTRAINT chk_meta_messages_delivery_part_message_ids
      CHECK (
        jsonb_typeof(delivery_part_message_ids) = 'array'
        AND jsonb_array_length(delivery_part_message_ids) = delivery_next_part_index
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.meta_messages'::regclass
      AND conname = 'chk_meta_messages_instagram_delivery_complete'
  ) THEN
    ALTER TABLE public.meta_messages
      ADD CONSTRAINT chk_meta_messages_instagram_delivery_complete
      CHECK (
        channel <> 'instagram'
        OR direction <> 'outgoing'
        OR delivery_part_count IS NULL
        OR status NOT IN ('sent', 'delivered', 'read')
        OR delivery_next_part_index = delivery_part_count
      );
  END IF;
END
$$;

COMMIT;
