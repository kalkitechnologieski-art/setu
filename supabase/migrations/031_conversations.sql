-- 031_conversations.sql — Unified inbox conversations + messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  channel text NOT NULL CHECK (channel IN (
    'whatsapp','email','instagram_dm','facebook_messenger','threads','sms','web_chat'
  )),
  subject text,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','pending','resolved','snoozed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  sentiment text CHECK (sentiment IN ('positive','neutral','negative','frustrated')),
  last_message_at timestamptz,
  last_message_preview text,
  unread_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_status_idx
  ON public.conversations (user_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_user_channel_idx
  ON public.conversations (user_id, channel);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_type text NOT NULL CHECK (sender_type IN ('contact','agent','human','system')),
  sender_name text,
  content text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  channel_message_id text,
  is_internal_note boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversation_messages_conv_idx
  ON public.conversation_messages (conversation_id, created_at ASC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_all_own" ON public.conversations;
CREATE POLICY "conversations_all_own" ON public.conversations
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversation_messages_all_own" ON public.conversation_messages;
CREATE POLICY "conversation_messages_all_own" ON public.conversation_messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = (SELECT auth.uid()))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='conversation_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
  END IF;
END $$;
