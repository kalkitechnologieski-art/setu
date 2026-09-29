-- 030_media_library.sql — Media assets + post_media junction
CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  org_id uuid,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('image','video','audio')),
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  width int,
  height int,
  duration_seconds int,
  storage_path text NOT NULL,
  thumbnail_path text,
  alt_text text,
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_assets_user_idx ON public.media_assets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_type_idx ON public.media_assets (user_id, type);

CREATE TABLE IF NOT EXISTS public.post_media (
  post_id uuid NOT NULL REFERENCES public.content_posts(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  caption text,
  alt_text text,
  PRIMARY KEY (post_id, media_id)
);

ALTER TABLE public.content_posts
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'feed'
    CHECK (post_type IN ('feed','story','reel','carousel','thread')),
  ADD COLUMN IF NOT EXISTS platform_post_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS publish_errors jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS collaborators text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_assets_all_own" ON public.media_assets;
CREATE POLICY "media_assets_all_own" ON public.media_assets
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "post_media_all_own" ON public.post_media;
CREATE POLICY "post_media_all_own" ON public.post_media
  FOR ALL TO authenticated
  USING (
    post_id IN (SELECT id FROM public.content_posts WHERE user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    post_id IN (SELECT id FROM public.content_posts WHERE user_id = (SELECT auth.uid()))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='media_assets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets;
  END IF;
END $$;
