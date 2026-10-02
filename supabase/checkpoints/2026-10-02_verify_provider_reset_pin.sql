-- Verify provider activation PIN reset
select
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_provider_reset_activation_pin'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_reset_pin_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_provider_reset_activation_pin'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_reset_pin_execute;
