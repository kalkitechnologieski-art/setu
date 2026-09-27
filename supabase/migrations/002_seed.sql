-- ═══════════════════════════════════════════════════════════════════════════
-- Setu Kalki Intelligence — 002_seed.sql (development seed — idempotent)
-- ═══════════════════════════════════════════════════════════════════════════

-- Demo profile (only if no profiles exist yet)
do $$
declare
  v_user_id uuid;
begin
  if not exists (select 1 from public.profiles limit 1) then
    v_user_id := gen_random_uuid();
    insert into public.profiles (id, email, full_name, plan)
    values (v_user_id, 'demo@setu.local', 'Demo User', 'growth')
    on conflict (id) do nothing;

    insert into public.leads (user_id, name, email, company, title, source, status, score)
    values
      (v_user_id, 'Aarav Sharma',   'aarav@acme.in',     'Acme Industries', 'VP Sales',    'linkedin', 'qualified', 82),
      (v_user_id, 'Diya Patel',     'diya@brighttech.io','BrightTech',      'CMO',         'webinar',  'contacted', 65),
      (v_user_id, 'Vihaan Reddy',   'vihaan@nexus.ai',   'Nexus AI',        'Head Growth', 'referral', 'new',       40)
    on conflict do nothing;
  end if;
end $$;
