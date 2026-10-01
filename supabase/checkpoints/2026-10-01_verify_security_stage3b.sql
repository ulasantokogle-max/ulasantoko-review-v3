-- Verify Security Hardening V1 / Stage 3B

-- A. Rate-limit table exists and RLS is enabled.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'feedback_rate_limits';

-- B. Browser roles must have ZERO direct table privileges.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'feedback_rate_limits'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- C. Public feedback RPC remains callable by anon + authenticated only.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where specific_schema = 'public'
  and routine_name = 'v3_submit_feedback'
  and grantee in ('anon','authenticated','PUBLIC')
order by grantee;

-- D. Diagnostic count only.
select count(*) as feedback_rate_limit_rows
from public.feedback_rate_limits;
