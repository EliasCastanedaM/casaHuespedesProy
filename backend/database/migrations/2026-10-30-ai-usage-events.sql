-- Métricas de consumo de OpenAI. No se almacenan mensajes, emails ni teléfonos.
-- Las estimaciones USD NO sustituyen la facturación oficial de OpenAI.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 response_id VARCHAR(128) NOT NULL UNIQUE,
 channel VARCHAR(24) NOT NULL CHECK (channel IN ('whatsapp','instagram','facebook','web','other')),
 operation VARCHAR(32) NOT NULL CHECK (operation IN ('scope_classifier','assistant_response','tool_followup')),
 model VARCHAR(100) NOT NULL,
 conversation_tag CHAR(24),
 input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
 cached_input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (cached_input_tokens >= 0),
 output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
 reasoning_output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (reasoning_output_tokens >= 0),
 estimated_cost_usd NUMERIC(16,10),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_created ON public.ai_usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_channel_created ON public.ai_usage_events(channel, created_at DESC);
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.ai_usage_events_id_seq FROM anon, authenticated;
COMMIT;
