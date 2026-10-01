-- Verify Contact & WhatsApp settings V1

select
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'businesses'
      and column_name = 'whatsapp_number'
  ) as whatsapp_column_exists,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_update_business_contact_settings'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) as authenticated_update_execute,
  (
    select count(*)
    from information_schema.role_routine_grants
    where specific_schema = 'public'
      and routine_name = 'v3_get_public_business_contact'
      and grantee = 'anon'
      and privilege_type = 'EXECUTE'
  ) as anon_public_contact_execute;
