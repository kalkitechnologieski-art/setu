-- 026_agent_schedules.sql — Autonomous scheduling + run tracing
CREATE TABLE IF NOT EXISTS agent_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  name text NOT NULL,
  cron_expression text NOT NULL,
  task_template jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_run_status text,
  consecutive_failures int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_run_steps (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL,
  step_index int NOT NULL,
  description text, tool text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','skipped')),
  input jsonb, output jsonb,
  confidence numeric(4,3),
  error text, duration_ms int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
