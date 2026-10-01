-- Verify Stage 2B
-- Expected result: ZERO rows.

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'users','organizations','organization_members','businesses','business_members',
    'cards','card_provisioning','card_activation','card_transfer_history',
    'landing_pages','landing_versions','landing_blocks','google_review_profiles',
    'interaction_events','feedback_submissions','feedback_notes','subscriptions',
    'audit_logs','provider_admins'
  )
  and grantee in ('anon','authenticated')
  and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER')
order by table_name, grantee, privilege_type;

-- Also expected: ZERO rows for the ultra-sensitive tables.
select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('card_activation','provider_admins')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;
