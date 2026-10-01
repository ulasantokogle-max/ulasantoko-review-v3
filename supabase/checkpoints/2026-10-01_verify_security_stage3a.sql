-- Verify Security Hardening V1 / Stage 3A
-- A. Attempt log table exists and is RLS protected.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'card_activation_attempts';

-- B. Browser roles must have ZERO direct table privileges.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'card_activation_attempts'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;

-- C. v3_claim_card must remain callable only by authenticated browser users.
select
  routine_name,
  grantee,
  privilege_type
from information_schema.role_routine_grants
where specific_schema = 'public'
  and routine_name = 'v3_claim_card'
  and grantee in ('anon','authenticated','PUBLIC')
order by grantee;

-- D. Current activation state (diagnostic only; no PIN/hash output).
select
  c.card_code,
  c.activation_status::text as activation_status,
  ca.attempt_count,
  ca.locked_until,
  ca.activated_at
from public.cards c
left join public.card_activation ca on ca.card_id = c.id
order by c.created_at desc
limit 20;
