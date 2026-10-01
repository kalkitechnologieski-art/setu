
-- ═══════════════════════════════════════════════════════════════════════════
-- 060_phase1_foundation.sql
-- Phase 1 tables: events, audit_log, feature flags, workflows, search, usage
-- Idempotent. Safe to re-run. Run manually in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── events (append-only domain event log) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_id uuid,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_aggregate_idx
  ON public.events (aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_type_idx
  ON public.events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS events_user_idx
  ON public.events (user_id, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_own" ON public.events;
CREATE POLICY "events_select_own" ON public.events
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "events_insert_own" ON public.events;
CREATE POLICY "events_insert_own" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- ─── audit_log (immutable) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_id uuid,
  actor_type text NOT NULL CHECK (actor_type IN ('human','agent','system')),
  actor_id text NOT NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before jsonb,
  after jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_user_idx
  ON public.audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx
  ON public.audit_log (resource_type, resource_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_action_idx
  ON public.audit_log (action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_own" ON public.audit_log;
CREATE POLICY "audit_log_select_own" ON public.audit_log
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "audit_log_insert_own" ON public.audit_log;
CREATE POLICY "audit_log_insert_own" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- ─── feature_flags ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  default_value boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 0
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  org_allowlist uuid[] DEFAULT NULL,
  user_allowlist uuid[] DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feature_flags_name_idx ON public.feature_flags (name);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feature_flags_read_all" ON public.feature_flags;
CREATE POLICY "feature_flags_read_all" ON public.feature_flags
  FOR SELECT TO authenticated
  USING (true);

-- ─── feature_flag_evaluations (audit of flag decisions) ─────────────────
CREATE TABLE IF NOT EXISTS public.feature_flag_evaluations (
  id bigserial PRIMARY KEY,
  flag_name text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  org_id uuid,
  result boolean NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ffe_flag_idx
  ON public.feature_flag_evaluations (flag_name, evaluated_at DESC);

ALTER TABLE public.feature_flag_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ffe_insert_all" ON public.feature_flag_evaluations;
CREATE POLICY "ffe_insert_all" ON public.feature_flag_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ffe_select_own" ON public.feature_flag_evaluations;
CREATE POLICY "ffe_select_own" ON public.feature_flag_evaluations
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ─── service_workflows ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id text NOT NULL,
  name text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'manual'
    CHECK (trigger_type IN ('manual','cron','event')),
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS service_workflows_user_idx
  ON public.service_workflows (user_id, service_id, enabled);
CREATE INDEX IF NOT EXISTS service_workflows_trigger_idx
  ON public.service_workflows (trigger_type, enabled)
  WHERE enabled = true;

ALTER TABLE public.service_workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_workflows_all_own" ON public.service_workflows;
CREATE POLICY "service_workflows_all_own" ON public.service_workflows
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── service_workflow_runs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.service_workflows(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','completed','partial','failed','halted')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  steps_completed int NOT NULL DEFAULT 0,
  steps_skipped int NOT NULL DEFAULT 0,
  steps_failed int NOT NULL DEFAULT 0,
  degraded boolean NOT NULL DEFAULT false,
  error text
);

CREATE INDEX IF NOT EXISTS swr_workflow_idx
  ON public.service_workflow_runs (workflow_id, started_at DESC);
CREATE INDEX IF NOT EXISTS swr_user_idx
  ON public.service_workflow_runs (user_id, started_at DESC);

ALTER TABLE public.service_workflow_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swr_all_own" ON public.service_workflow_runs;
CREATE POLICY "swr_all_own" ON public.service_workflow_runs
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── service_workflow_steps ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_workflow_steps (
  id bigserial PRIMARY KEY,
  run_id uuid REFERENCES public.service_workflow_runs(id) ON DELETE CASCADE,
  step_index int NOT NULL,
  service_id text NOT NULL,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','running','ok','skipped','failed','deferred')),
  input jsonb,
  output jsonb,
  error text,
  reason text,
  duration_ms int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sws_run_idx
  ON public.service_workflow_steps (run_id, step_index);
CREATE INDEX IF NOT EXISTS sws_status_idx
  ON public.service_workflow_steps (status, created_at DESC)
  WHERE status IN ('deferred', 'failed');

ALTER TABLE public.service_workflow_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sws_all_own" ON public.service_workflow_steps;
CREATE POLICY "sws_all_own" ON public.service_workflow_steps
  FOR ALL TO authenticated
  USING (
    run_id IN (SELECT id FROM public.service_workflow_runs WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    run_id IN (SELECT id FROM public.service_workflow_runs WHERE user_id = (SELECT auth.uid()))
  );

-- ─── service_dependencies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.service_dependencies (
  from_service text NOT NULL,
  to_service text NOT NULL,
  criticality text NOT NULL CHECK (criticality IN ('critical','optional')),
  PRIMARY KEY (from_service, to_service)
);

INSERT INTO public.service_dependencies (from_service, to_service, criticality)
VALUES
  ('email',       'leads',       'critical'),
  ('email',       'assistant',   'optional'),
  ('calling',     'leads',       'critical'),
  ('calling',     'email',       'optional'),
  ('leads',       'assistant',   'optional'),
  ('performance', 'assistant',   'optional'),
  ('performance', 'leads',       'optional'),
  ('assistant',   'leads',       'critical'),
  ('assistant',   'email',       'optional'),
  ('assistant',   'calling',     'optional'),
  ('assistant',   'performance', 'optional')
ON CONFLICT (from_service, to_service) DO NOTHING;

ALTER TABLE public.service_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_dependencies_read_all" ON public.service_dependencies;
CREATE POLICY "service_dependencies_read_all" ON public.service_dependencies
  FOR SELECT TO authenticated USING (true);

-- ─── usage_events (billing metering) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid,
  service_id text NOT NULL,
  metric text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  cost_cents int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_events_user_idx
  ON public.usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_metric_idx
  ON public.usage_events (metric, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usage_events_select_own" ON public.usage_events;
CREATE POLICY "usage_events_select_own" ON public.usage_events
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "usage_events_insert_own" ON public.usage_events;
CREATE POLICY "usage_events_insert_own" ON public.usage_events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id OR user_id IS NULL);

-- ─── rate_limits_v2 (persistent rate limit state) ───────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits_v2 (
  key text PRIMARY KEY,
  count int NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- ─── webhook_subscriptions (outbound webhooks) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  event_types text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  last_delivery_status text,
  failure_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_subs_user_idx
  ON public.webhook_subscriptions (user_id, enabled);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_subs_all_own" ON public.webhook_subscriptions;
CREATE POLICY "webhook_subs_all_own" ON public.webhook_subscriptions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── webhook_deliveries (delivery log) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id bigserial PRIMARY KEY,
  subscription_id uuid REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','delivered','failed','dead_letter')),
  attempts int NOT NULL DEFAULT 0,
  response_code int,
  response_body text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliv_sub_idx
  ON public.webhook_deliveries (subscription_id, created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliv_pending_idx
  ON public.webhook_deliveries (next_retry_at)
  WHERE status = 'pending';

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_deliv_select_own" ON public.webhook_deliveries;
CREATE POLICY "webhook_deliv_select_own" ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.webhook_subscriptions WHERE user_id = (SELECT auth.uid())
    )
  );

-- ─── search_index (cross-entity search) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_index (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  ) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_index_vector_idx
  ON public.search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS search_index_user_idx
  ON public.search_index (user_id, entity_type);

ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_index_all_own" ON public.search_index;
CREATE POLICY "search_index_all_own" ON public.search_index
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ─── Extend existing tables ─────────────────────────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lifecycle_state text NOT NULL DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS email_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_ready boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS timezone text;

CREATE INDEX IF NOT EXISTS leads_lifecycle_idx
  ON public.leads (user_id, lifecycle_state);
CREATE INDEX IF NOT EXISTS leads_channel_ready_idx
  ON public.leads (user_id, email_ready, call_ready)
  WHERE email_ready = true OR call_ready = true;

-- ─── Realtime publication for new tables ────────────────────────────────
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'events', 'audit_log', 'service_workflows', 'service_workflow_runs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = tbl) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

-- ─── Verification ───────────────────────────────────────────────────────
SELECT
  schemaname,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'events', 'audit_log', 'feature_flags', 'feature_flag_evaluations',
    'service_workflows', 'service_workflow_runs', 'service_workflow_steps',
    'service_dependencies', 'usage_events', 'rate_limits_v2',
    'webhook_subscriptions', 'webhook_deliveries', 'search_index'
  )
ORDER BY tablename;
