-- Casa Huéspedes Pimentel: estado de cierre para el panel de mensajes.
-- No modifica reservas, clientes, políticas ni el control de atención IA/manual.
BEGIN;
ALTER TABLE public.meta_conversations
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_meta_conversations_resolved_at
  ON public.meta_conversations(resolved_at)
  WHERE resolved_at IS NOT NULL;
COMMIT;
