-- Verify Provider Factory Reset / Transfer Ownership V1
select
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_provider_factory_reset_card'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_factory_reset_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_provider_factory_reset_card'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_factory_reset_execute;
