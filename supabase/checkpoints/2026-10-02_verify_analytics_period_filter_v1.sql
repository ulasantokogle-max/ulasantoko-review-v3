-- Verify Analytics period filter V1
select
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_get_business_analytics_period'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_period_analytics_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_get_business_analytics_period'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_period_analytics_execute;
