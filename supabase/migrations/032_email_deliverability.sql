-- 032_email_deliverability.sql — Domain health + bounce tracking
CREATE TABLE IF NOT EXISTS public.email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  domain text NOT NULL,
  spf_verified boolean NOT NULL DEFAULT false,
  dkim_verified boolean NOT NULL DEFAULT false,
  dmarc_verified boolean NOT NULL DEFAULT false,
  dmarc_policy text CHECK (dmarc_policy IN ('none','quarantine','reject')),
  sender_score int NOT NULL DEFAULT 0,
  warmup_stage int NOT NULL DEFAULT 1,
  daily_send_limit int NOT NULL DEFAULT 50,
  bounce_rate numeric(5,2) NOT NULL DEFAULT 0,
  complaint_rate numeric(5,2) NOT NULL DEFAULT 0,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain)
);

CREATE INDEX IF NOT EXISTS email_domains_user_idx ON public.email_domains (user_id);

CREATE TABLE IF NOT EXISTS public.email_bounces (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text NOT NULL,
  bounce_type text NOT NULL CHECK (bounce_type IN ('hard','soft','complaint')),
  reason text,
  bounced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_bounces_user_idx ON public.email_bounces (user_id, bounced_at DESC);
CREATE INDEX IF NOT EXISTS email_bounces_email_idx ON public.email_bounces (email);

ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_bounces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_domains_all_own" ON public.email_domains;
CREATE POLICY "email_domains_all_own" ON public.email_domains
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "email_bounces_all_own" ON public.email_bounces;
CREATE POLICY "email_bounces_all_own" ON public.email_bounces
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
