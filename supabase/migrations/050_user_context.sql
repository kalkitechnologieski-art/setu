-- 050_user_context.sql — User context snapshots for Siddhi AI
-- RUN MANUALLY in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.user_context_snapshots (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  activity jsonb NOT NULL DEFAULT '{}'::jsonb,
  business_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  behavioral_patterns jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_computed_at timestamptz NOT NULL DEFAULT now(),
  version int NOT NULL DEFAULT 1
);

ALTER TABLE public.user_context_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_context_select_own" ON public.user_context_snapshots;
CREATE POLICY "user_context_select_own" ON public.user_context_snapshots
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_context_insert_own" ON public.user_context_snapshots;
CREATE POLICY "user_context_insert_own" ON public.user_context_snapshots
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "user_context_update_own" ON public.user_context_snapshots;
CREATE POLICY "user_context_update_own" ON public.user_context_snapshots
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
