-- Private queue for synthetic advisor conversations. Never expose this schema
-- in the Supabase Data API. The normal guest message tables are not used.
CREATE SCHEMA IF NOT EXISTS advisor_qa;
REVOKE ALL ON SCHEMA advisor_qa FROM PUBLIC, anon, authenticated;

CREATE TABLE advisor_qa.runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expected_commit text NOT NULL CHECK (expected_commit ~ '^[a-f0-9]{40}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','stopped','failed','cancelled')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  max_calls integer NOT NULL DEFAULT 20 CHECK (max_calls BETWEEN 1 AND 24),
  max_tokens integer NOT NULL DEFAULT 60000 CHECK (max_tokens BETWEEN 1000 AND 80000),
  result jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '15 minutes')
);
ALTER TABLE advisor_qa.runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON advisor_qa.runs FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA advisor_qa TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON advisor_qa.runs TO service_role;
CREATE INDEX advisor_qa_runs_pending ON advisor_qa.runs(created_at) WHERE status='queued';
