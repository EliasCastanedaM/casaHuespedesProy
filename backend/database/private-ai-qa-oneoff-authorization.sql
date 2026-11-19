-- Explicit administrator approval for ONE private QA run. No global cap change.
CREATE TABLE advisor_qa.run_authorizations (
  run_id uuid PRIMARY KEY REFERENCES advisor_qa.runs(id) ON DELETE CASCADE,
  approved_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 240),
  CHECK (expires_at>approved_at AND expires_at<=approved_at+interval '1 hour'),
  CHECK (consumed_at IS NULL OR consumed_at>=approved_at)
);
ALTER TABLE advisor_qa.run_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON advisor_qa.run_authorizations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON advisor_qa.run_authorizations TO service_role;
