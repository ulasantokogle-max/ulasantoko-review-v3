-- Verify Customer Reset Setup V1
select
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_customer_reset_card_setup'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_reset_setup_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_customer_reset_card_setup'
      and grantee in ('anon','PUBLIC')
      and privilege_type = 'EXECUTE'
  ) as public_reset_setup_execute;
