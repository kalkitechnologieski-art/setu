-- 035_organizations_teams.sql — Multi-tenant orgs + JWT claims + RLS
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free','starter','growth','scale','enterprise')),
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner','admin','member','viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.organization_members (user_id);
CREATE INDEX IF NOT EXISTS org_members_org_idx ON public.organization_members (org_id);

-- JWT custom claim helpers
CREATE OR REPLACE FUNCTION public.auth_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_array_elements_text(
    (auth.jwt() -> 'app_metadata' -> 'org_ids')
  )::UUID
$$;

-- Refresh JWT claims (call from Edge Function after membership change)
CREATE OR REPLACE FUNCTION public.refresh_user_org_claims(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_ids uuid[];
BEGIN
  SELECT array_agg(org_id) INTO v_org_ids
    FROM public.organization_members
    WHERE user_id = p_user_id;

  UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('org_ids', COALESCE(v_org_ids, ARRAY[]::uuid[]))
    WHERE id = p_user_id;
END;
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_select_member" ON public.organizations;
CREATE POLICY "orgs_select_member" ON public.organizations
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.auth_org_ids()));

DROP POLICY IF EXISTS "orgs_update_admin" ON public.organizations;
CREATE POLICY "orgs_update_admin" ON public.organizations
  FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT org_id FROM public.organization_members
      WHERE user_id = (SELECT auth.uid()) AND role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "org_members_select_member" ON public.organization_members;
CREATE POLICY "org_members_select_member" ON public.organization_members
  FOR SELECT TO authenticated
  USING (org_id IN (SELECT public.auth_org_ids()));

-- Auto-create org on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_org()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  v_slug := 'workspace-' || substr(replace(new.id::text, '-', ''), 1, 12);
  INSERT INTO public.organizations (name, slug)
  VALUES (COALESCE(NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''), 'My Workspace'), v_slug)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role, joined_at)
  VALUES (v_org_id, new.id, 'owner', now());

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_org();
