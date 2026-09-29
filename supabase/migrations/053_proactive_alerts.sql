-- 053_proactive_alerts.sql — Proactive monitoring alerts (PAGER pattern)
-- RUN MANUALLY in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.proactive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning'
    CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  body text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proactive_alerts_user_idx
  ON public.proactive_alerts (user_id, created_at DESC);

ALTER TABLE public.proactive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proactive_alerts_all_own" ON public.proactive_alerts;
CREATE POLICY "proactive_alerts_all_own" ON public.proactive_alerts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
