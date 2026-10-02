-- Verify only one Landing Page update RPC overload remains.
select
  (
    select count(*)
    from information_schema.routines
    where routine_schema='public'
      and routine_name='v3_update_landing_page_settings'
  ) as update_function_count,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='v3_update_landing_page_settings'
      and grantee='authenticated'
      and privilege_type='EXECUTE'
  ) as authenticated_update_execute;
