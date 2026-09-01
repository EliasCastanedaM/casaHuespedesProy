-- Casa Huéspedes Pimentel
-- Migración idempotente para la versión con asesor IA y seguridad reforzada.
-- Ejecutar en Supabase > SQL Editor ANTES de publicar el nuevo backend.
-- No elimina tablas ni registros existentes.

BEGIN;

ALTER TABLE IF EXISTS rooms
  ADD COLUMN IF NOT EXISTS room_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS floor_label VARCHAR(80),
  ADD COLUMN IF NOT EXISTS room_type VARCHAR(80),
  ADD COLUMN IF NOT EXISTS bed_type VARCHAR(180),
  ADD COLUMN IF NOT EXISTS view_type VARCHAR(120),
  ADD COLUMN IF NOT EXISTS room_size_m2 NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS ux_rooms_room_number
ON rooms(room_number)
WHERE room_number IS NOT NULL;

ALTER TABLE IF EXISTS bookings
  ADD COLUMN IF NOT EXISTS booking_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS check_in_time TIME,
  ADD COLUMN IF NOT EXISTS public_token UUID,
  ADD COLUMN IF NOT EXISTS payment_reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_booking_code
ON bookings(booking_code)
WHERE booking_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_bookings_public_token
ON bookings(public_token)
WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_availability
ON bookings(room_id, check_in, check_out)
WHERE status IN (
  'pending',
  'pending_payment',
  'payment_reported',
  'confirmed'
);

ALTER TABLE IF EXISTS payments
  ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS availability_settings (
  id SERIAL PRIMARY KEY,
  setting_name VARCHAR(60) NOT NULL UNIQUE DEFAULT 'default',
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '22:00',
  slot_minutes INTEGER NOT NULL DEFAULT 30 CHECK (slot_minutes > 0),
  monday BOOLEAN NOT NULL DEFAULT TRUE,
  tuesday BOOLEAN NOT NULL DEFAULT TRUE,
  wednesday BOOLEAN NOT NULL DEFAULT TRUE,
  thursday BOOLEAN NOT NULL DEFAULT TRUE,
  friday BOOLEAN NOT NULL DEFAULT TRUE,
  saturday BOOLEAN NOT NULL DEFAULT TRUE,
  sunday BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO availability_settings (setting_name)
VALUES ('default')
ON CONFLICT (setting_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  blocked_time TIME,
  block_type VARCHAR(20) NOT NULL DEFAULT 'day'
    CHECK (block_type IN ('day', 'time')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (block_type = 'day' AND blocked_time IS NULL)
    OR (block_type = 'time' AND blocked_time IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_lookup
ON blocked_slots(room_id, blocked_date, block_type, blocked_time);

CREATE TABLE IF NOT EXISTS ai_conversations (
  channel VARCHAR(30) NOT NULL,
  external_user_id VARCHAR(160) NOT NULL,
  last_response_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel, external_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated_at
ON ai_conversations(updated_at);

CREATE TABLE IF NOT EXISTS ai_processed_messages (
  channel VARCHAR(30) NOT NULL,
  message_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (channel, message_id)
);

-- Solo crea la vista si no existe. Una vista personalizada de producción
-- se conserva para evitar reemplazar columnas utilizadas por el frontend.
DO $$
BEGIN
  IF to_regclass('public.vw_bookings_admin') IS NULL THEN
    EXECUTE $view$
      CREATE VIEW vw_bookings_admin AS
      SELECT
        b.*,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.document_type,
        c.document_number,
        r.name AS room_name,
        r.price_per_night,
        p.payment_provider,
        p.status AS payment_status,
        p.payment_url,
        p.reported_at,
        p.paid_at
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      JOIN rooms r ON r.id = b.room_id
      LEFT JOIN LATERAL (
        SELECT payment.*
        FROM payments payment
        WHERE payment.booking_id = b.id
        ORDER BY payment.created_at DESC, payment.id DESC
        LIMIT 1
      ) p ON TRUE
    $view$;
  END IF;
END $$;

COMMIT;
