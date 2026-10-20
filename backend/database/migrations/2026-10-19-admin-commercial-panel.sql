-- Panel de reglas comerciales (propuesta → aprobación humana).
-- NO cambia room_categories, bookings, blocked_slots ni payments.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public.hotel_rule_proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_code varchar(80) NOT NULL REFERENCES public.hotel_policy_rules(code),
  proposed_config jsonb NOT NULL CHECK (jsonb_typeof(proposed_config) = 'object'),
  previous_updated_at timestamptz NOT NULL,
  note varchar(500),
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  proposed_by text NOT NULL,
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK ((status='pending' AND decided_by IS NULL AND decided_at IS NULL)
      OR (status<>'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.hotel_seasons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title varchar(120) NOT NULL,
  season_type varchar(18) NOT NULL CHECK (season_type IN ('high','holiday','event')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  min_nights smallint CHECK (min_nights IS NULL OR min_nights BETWEEN 1 AND 30),
  proposed_adjustment_percent numeric(6,2)
    CHECK (proposed_adjustment_percent IS NULL OR proposed_adjustment_percent BETWEEN -30 AND 50),
  deposit_percent numeric(5,2)
    CHECK (deposit_percent IS NULL OR deposit_percent BETWEEN 0 AND 100),
  note varchar(500),
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  proposed_by text NOT NULL,
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK (end_date >= start_date),
  CHECK ((status='pending' AND decided_by IS NULL AND decided_at IS NULL)
      OR (status<>'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.hotel_rate_proposals (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_slug varchar(100) NOT NULL REFERENCES public.room_categories(slug),
  base_price_snapshot numeric(12,2) NOT NULL CHECK (base_price_snapshot > 0),
  suggested_price numeric(12,2) NOT NULL CHECK (suggested_price > 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason varchar(500) NOT NULL,
  source varchar(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai_suggestion')),
  status varchar(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  proposed_by text NOT NULL,
  decided_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  CHECK (end_date >= start_date),
  CHECK ((status='pending' AND decided_by IS NULL AND decided_at IS NULL)
      OR (status<>'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_hotel_rule_proposals_pending
  ON public.hotel_rule_proposals(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotel_seasons_dates
  ON public.hotel_seasons(start_date,end_date,status);
CREATE INDEX IF NOT EXISTS idx_hotel_rate_proposals_pending
  ON public.hotel_rate_proposals(status,created_at DESC);

ALTER TABLE public.hotel_rule_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rate_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE
 public.hotel_rule_proposals, public.hotel_seasons, public.hotel_rate_proposals
 FROM PUBLIC, anon, authenticated;
-- El acceso se hace exclusivamente a través del backend Node autenticado.
