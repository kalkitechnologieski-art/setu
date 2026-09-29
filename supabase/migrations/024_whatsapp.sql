-- 024_whatsapp.sql — WhatsApp Business API tables
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  phone_number_id text NOT NULL,
  display_phone_number text,
  business_name text,
  messaging_tier text DEFAULT 'TIER_250',
  quality_rating text DEFAULT 'GREEN',
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waba_id text NOT NULL,
  template_name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text NOT NULL CHECK (category IN ('MARKETING','UTILITY','AUTHENTICATION')),
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','APPROVED','REJECTED','PAUSED')),
  components jsonb NOT NULL DEFAULT '[]',
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_phone text NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  consent_type text NOT NULL CHECK (consent_type IN ('opt_in','opt_out')),
  consent_source text NOT NULL,
  consent_text text NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  waba_id text NOT NULL,
  template_name text,
  message_type text NOT NULL CHECK (message_type IN ('template','free_form','interactive')),
  direction text NOT NULL CHECK (direction IN ('outbound','inbound')),
  status text NOT NULL DEFAULT 'queued',
  message_id text UNIQUE,
  cost_inr numeric(8,4) DEFAULT 0,
  conversation_window_until timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_messages_user_idx
  ON public.whatsapp_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS whatsapp_consents_phone_idx
  ON public.whatsapp_consents (contact_phone);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_accounts_all_own" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_all_own" ON public.whatsapp_accounts
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "whatsapp_templates_all_own" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_all_own" ON public.whatsapp_templates
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "whatsapp_consents_all_own" ON public.whatsapp_consents;
CREATE POLICY "whatsapp_consents_all_own" ON public.whatsapp_consents
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "whatsapp_messages_all_own" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_all_own" ON public.whatsapp_messages
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
