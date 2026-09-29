-- 025_approval_execution.sql — Approval execution trigger + policy tables
CREATE TABLE IF NOT EXISTS action_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agent_slug text NOT NULL,
  action_name text NOT NULL,
  tier text NOT NULL DEFAULT 'approve'
    CHECK (tier IN ('auto','notify','approve','forbidden')),
  max_daily_volume int DEFAULT 100,
  requires_justification boolean DEFAULT false,
  auto_approve_below_confidence numeric(4,3),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, agent_slug, action_name)
);

ALTER TABLE public.approvals ADD COLUMN IF NOT EXISTS
  risk_level text CHECK (risk_level IN ('low','medium','high','critical')),
  justification text,
  execution_status text DEFAULT 'none'
    CHECK (execution_status IN ('none','queued','executing','completed','failed')),
  execution_result jsonb;

CREATE OR REPLACE FUNCTION public.enqueue_approved_approval()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.job_queue (user_id, job_type, payload)
    VALUES (NEW.user_id, 'execute_approval',
            jsonb_build_object('approval_id', NEW.id));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enqueue_approved_approval ON public.approvals;
CREATE TRIGGER trg_enqueue_approved_approval
  AFTER UPDATE ON public.approvals
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.enqueue_approved_approval();
