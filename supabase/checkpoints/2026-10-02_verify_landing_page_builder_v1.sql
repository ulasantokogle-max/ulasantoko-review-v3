-- Verify Landing Page Builder V1
select
  to_regclass('public.landing_page_settings') is not null as settings_table_exists,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='v3_get_landing_page_settings'
      and grantee='authenticated'
      and privilege_type='EXECUTE'
  ) as authenticated_get_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='v3_update_landing_page_settings'
      and grantee='authenticated'
      and privilege_type='EXECUTE'
  ) as authenticated_update_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='v3_get_public_landing_page'
      and grantee='anon'
      and privilege_type='EXECUTE'
  ) as anon_public_lp_execute;
