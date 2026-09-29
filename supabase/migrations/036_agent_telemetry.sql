-- 036_agent_telemetry.sql — OpenTelemetry GenAI spans + evaluations
CREATE TABLE IF NOT EXISTS public.agent_telemetry (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id uuid,
  trace_id text NOT NULL,
  span_id text NOT NULL,
  parent_span_id text,
  agent_slug text NOT NULL,
  step_index int,
  event_type text NOT NULL CHECK (event_type IN (
    'plan','llm_call','tool_call','tool_result','approval','error','summary'
  )),
  gen_ai_system text,
  gen_ai_operation text,
  gen_ai_request_model text,
  gen_ai_response_model text,
  gen_ai_input_tokens int DEFAULT 0,
  gen_ai_output_tokens int DEFAULT 0,
  duration_ms int DEFAULT 0,
  span_status text DEFAULT 'ok',
  exception_message text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_telemetry_trace_idx ON public.agent_telemetry (trace_id, created_at);
CREATE INDEX IF NOT EXISTS agent_telemetry_user_idx ON public.agent_telemetry (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.evaluation_results (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  scope text NOT NULL CHECK (scope IN ('system','trace','node')),
  score numeric(5,4),
  safety_flags text[] NOT NULL DEFAULT '{}',
  judge_model text,
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.policy_violations (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id uuid,
  policy_name text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info','warning','critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_telemetry_select_own" ON public.agent_telemetry;
CREATE POLICY "agent_telemetry_select_own" ON public.agent_telemetry
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "agent_telemetry_insert_own" ON public.agent_telemetry;
CREATE POLICY "agent_telemetry_insert_own" ON public.agent_telemetry
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "evaluation_results_all_own" ON public.evaluation_results;
CREATE POLICY "evaluation_results_all_own" ON public.evaluation_results
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "policy_violations_all_own" ON public.policy_violations;
CREATE POLICY "policy_violations_all_own" ON public.policy_violations
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
