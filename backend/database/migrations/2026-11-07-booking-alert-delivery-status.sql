-- Seguimiento real de entrega de notificaciones administrativas de WhatsApp.
-- 'status=sent' confirma aceptación inicial por Graph API, no entrega en WhatsApp.
BEGIN;

ALTER TABLE public.booking_alert_outbox
  ADD COLUMN IF NOT EXISTS delivery_status TEXT
    CHECK (delivery_status IN ('accepted', 'sent', 'delivered', 'read', 'failed')),
  ADD COLUMN IF NOT EXISTS delivery_error_code INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_error_title TEXT,
  ADD COLUMN IF NOT EXISTS delivery_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS booking_alert_outbox_meta_message_idx
  ON public.booking_alert_outbox (meta_message_id)
  WHERE meta_message_id IS NOT NULL;

UPDATE public.booking_alert_outbox
SET delivery_status = 'accepted',
    delivery_updated_at = COALESCE(sent_at, created_at)
WHERE status = 'sent' AND delivery_status IS NULL;

COMMIT;
