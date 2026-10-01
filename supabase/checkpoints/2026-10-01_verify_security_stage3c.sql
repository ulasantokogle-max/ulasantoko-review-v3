-- Verify Security Hardening V1 / Stage 3C
select
  (
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'google_maps_resolver_attempts'
  ) as resolver_rls_enabled,
  (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'google_maps_resolver_attempts'
      and grantee in ('anon','authenticated')
  ) as direct_resolver_table_grants,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_check_google_maps_resolver_rate_limit'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_resolver_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_check_google_maps_resolver_rate_limit'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_resolver_execute;
