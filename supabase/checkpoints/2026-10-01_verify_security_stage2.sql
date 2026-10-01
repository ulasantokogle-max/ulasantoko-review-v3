-- UlasanToko Review V3
-- Verify Security Hardening V1 / Stage 2 after migration 0019.

-- A. Every sensitive table below should report rls_enabled = true.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'users','organizations','organization_members','businesses','business_members',
    'cards','card_provisioning','card_activation','card_transfer_history',
    'landing_pages','landing_versions','landing_blocks','google_review_profiles',
    'interaction_events','feedback_submissions','feedback_notes','subscriptions',
    'audit_logs','provider_admins'
  )
order by c.relname;

-- B. Review policies. There should be no broad USING (true) policy on customer/private tables.
select
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'users','organizations','organization_members','businesses','business_members',
    'cards','card_provisioning','card_activation','card_transfer_history',
    'landing_pages','landing_versions','landing_blocks','google_review_profiles',
    'interaction_events','feedback_submissions','feedback_notes','subscriptions',
    'audit_logs','provider_admins'
  )
order by tablename, policyname;

-- C. card_activation must not have direct browser grants.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'card_activation'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- D. provider_admins browser roles must not be able to INSERT/UPDATE/DELETE directly.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'provider_admins'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;
