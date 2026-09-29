-- 033_attribution.sql — Touchpoints + attribution credits
CREATE TABLE IF NOT EXISTS public.touchpoints (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  campaign_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  touched_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS touchpoints_user_lead_idx ON public.touchpoints (user_id, lead_id, touched_at DESC);

CREATE TABLE IF NOT EXISTS public.attributions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  conversion_event text NOT NULL,
  conversion_value numeric(12,2),
  channel_credits jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text NOT NULL DEFAULT 'linear',
  attributed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attributions_user_idx ON public.attributions (user_id, attributed_at DESC);

ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "touchpoints_all_own" ON public.touchpoints;
CREATE POLICY "touchpoints_all_own" ON public.touchpoints
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "attributions_all_own" ON public.attributions;
CREATE POLICY "attributions_all_own" ON public.attributions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
