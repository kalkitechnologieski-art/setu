-- ═══════════════════════════════════════════════════════════════════════════
-- 060_phase1_foundation.sql
-- Phase 1 tables: events, audit_log, feature flags, workflows, search
-- Idempotent. Safe to re-run.
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

-- ─── feature_flag_evaluations (audit) ───────────────────────────────────
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

DROP POLICY IF EXISTS "ffe_insert_all" ON public.feature
