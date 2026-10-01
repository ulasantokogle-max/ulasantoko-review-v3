-- Verify dashboard setup status helper
select
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_get_business_setup_status'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_setup_status_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_get_business_setup_status'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_setup_status_execute;
