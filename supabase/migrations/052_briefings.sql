-- 052_briefings.sql — Report-first briefing state + standing reports
-- RUN MANUALLY in Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  verdict text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS briefings_user_date_idx
  ON public.briefings (user_id, briefing_date DESC);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "briefings_all_own" ON public.briefings;
CREATE POLICY "briefings_all_own" ON public.briefings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.standing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  schedule text NOT NULL,
  template jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS standing_reports_due_idx
  ON public.standing_reports (next_run_at)
  WHERE enabled = true;

ALTER TABLE public.standing_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "standing_reports_all_own" ON public.standing_reports;
CREATE POLICY "standing_reports_all_own" ON public.standing_reports
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
