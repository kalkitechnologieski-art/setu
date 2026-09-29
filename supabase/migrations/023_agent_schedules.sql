-- =============================================================================
-- Setu Kalki — 023_agent_schedules.sql
-- Autonomous scheduling, run tracing, and step-level telemetry.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.agent_schedules (
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
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_schedules_due_idx
  ON public.agent_schedules (next_run_at)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS agent_schedules_user_idx
  ON public.agent_schedules (user_id, enabled);

ALTER TABLE public.agent_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_schedules_all_own" ON public.agent_schedules;
CREATE POLICY "agent_schedules_all_own" ON public.agent_schedules
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.agent_run_steps (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL,
  step_index int NOT NULL,
  description text,
  tool text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','completed','failed','skipped')),
  input jsonb,
  output jsonb,
  confidence numeric(4,3),
  error text,
  duration_ms int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_run_steps_run_idx
  ON public.agent_run_steps (run_id, step_index);

ALTER TABLE public.agent_run_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_run_steps_select_own" ON public.agent_run_steps;
CREATE POLICY "agent_run_steps_select_own" ON public.agent_run_steps
  FOR SELECT TO authenticated
  USING (
    run_id IN (
      SELECT id FROM public.agent_runs
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "agent_run_steps_insert_own" ON public.agent_run_steps;
CREATE POLICY "agent_run_steps_insert_own" ON public.agent_run_steps
  FOR INSERT TO authenticated
  WITH CHECK (
    run_id IN (
      SELECT id FROM public.agent_runs
      WHERE user_id = (SELECT auth.uid())
    )
  );
