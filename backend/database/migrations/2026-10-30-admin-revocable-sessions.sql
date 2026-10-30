-- Security: revocable admin/staff sessions.
-- Hash random session IDs; never store raw JWTs or browser credentials.
CREATE TABLE IF NOT EXISTS public.admin_sessions (
  sid_hash character(64) PRIMARY KEY,
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz NULL,
  CONSTRAINT admin_sessions_expiry_check CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS admin_sessions_active_user_idx
  ON public.admin_sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.admin_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_sessions TO service_role;
-- No RLS policies; access only from the trusted PostgreSQL backend.
