-- Verify Landing Page Cover Position V1
select
  exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='landing_page_settings'
      and column_name='cover_position'
  ) as cover_position_exists,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema='public'
      and routine_name='v3_update_landing_page_settings'
      and grantee='authenticated'
      and privilege_type='EXECUTE'
  ) as authenticated_update_execute;
