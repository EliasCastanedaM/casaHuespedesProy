-- Solicitudes privadas e idempotentes de registro/consulta de plantillas Meta.
-- Este esquema no envía mensajes y no altera reservas existentes.
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_template_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  template_name TEXT NOT NULL UNIQUE
    CHECK (char_length(template_name) BETWEEN 1 AND 512 AND template_name ~ '^[a-z0-9_]+,
  language_code TEXT NOT NULL DEFAULT 'es',
  waba_id TEXT NOT NULL CHECK (waba_id ~ '^[0-9]{10,25}$'),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','working','submitted','approved','rejected','failed','conflict')),
  provider_template_id TEXT,
  provider_status TEXT,
  provider_category TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_template_submissions_check
  ON public.whatsapp_template_submissions(next_check_at, id)
  WHERE status IN ('queued','working','submitted');

ALTER TABLE public.whatsapp_template_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_template_submissions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.whatsapp_template_submissions_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
),
  language_code TEXT NOT NULL DEFAULT 'es',
  waba_id TEXT NOT NULL CHECK (waba_id ~ '^[0-9]{10,25}$'),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','working','submitted','approved','rejected','failed','conflict')),
  provider_template_id TEXT,
  provider_status TEXT,
  provider_category TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  next_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_template_submissions_check
  ON public.whatsapp_template_submissions(next_check_at, id)
  WHERE status IN ('queued','working','submitted');

ALTER TABLE public.whatsapp_template_submissions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.whatsapp_template_submissions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SEQUENCE public.whatsapp_template_submissions_id_seq
  FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
