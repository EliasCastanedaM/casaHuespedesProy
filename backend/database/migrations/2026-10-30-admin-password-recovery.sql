-- One-time password recovery tokens. The raw token is only sent by email.
-- Database access remains private; no Data API role can read these records.
CREATE TABLE IF NOT EXISTS public.admin_password_resets (
  user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  CONSTRAINT reset_expiry_valid CHECK (expires_at > issued_at)
);
CREATE INDEX IF NOT EXISTS admin_password_resets_expiry_idx
  ON public.admin_password_resets(expires_at);
ALTER TABLE public.admin_password_resets ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.admin_password_resets FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_password_resets TO service_role;
