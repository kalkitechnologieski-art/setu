-- 034_ab_testing.sql — A/B tests + per-variant results
CREATE TABLE IF NOT EXISTS public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('subject','template','send_time')),
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  traffic_split jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','running','completed','paused')),
  winner_variant text,
  confidence numeric(5,4),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ab_test_results (
  id bigserial PRIMARY KEY,
  test_id uuid NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE,
  variant_id text NOT NULL,
  sends int NOT NULL DEFAULT 0,
  opens int NOT NULL DEFAULT 0,
  replies int NOT NULL DEFAULT 0,
  conversions int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (test_id, variant_id)
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ab_tests_all_own" ON public.ab_tests;
CREATE POLICY "ab_tests_all_own" ON public.ab_tests
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "ab_test_results_all_own" ON public.ab_test_results;
CREATE POLICY "ab_test_results_all_own" ON public.ab_test_results
  FOR ALL TO authenticated
  USING (
    test_id IN (SELECT id FROM public.ab_tests WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    test_id IN (SELECT id FROM public.ab_tests WHERE user_id = (SELECT auth.uid()))
  );
