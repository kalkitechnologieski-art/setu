-- 051_self_healing.sql — MAPE-K self-healing state store
-- RUN MANUALLY in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.recovery_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id uuid,
  anomaly_type text NOT NULL,
  recovery_strategy text NOT NULL,
  recovery_status text NOT NULL DEFAULT 'pending'
    CHECK (recovery_status IN ('pending','applied','failed')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recovery_events_user_idx
  ON public.recovery_events (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.health_checks (
  id bigserial PRIMARY KEY,
  service text NOT NULL,
  status text NOT NULL DEFAULT 'healthy'
    CHECK (status IN ('healthy','degraded','unhealthy')),
  latency_ms int,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS health_checks_service_idx
  ON public.health_checks (service, checked_at DESC);
