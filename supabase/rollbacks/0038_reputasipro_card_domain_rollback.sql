-- V3 only. Restore the provider function saved before migration 0038.
begin;
do $$
declare saved_definition text;
begin
  select definition into strict saved_definition
  from backup_20261003_domain.function_definitions
  where signature = 'public.v3_provider_create_card(text,text,text)';
  execute saved_definition;
end;
$$;
notify pgrst, 'reload schema';
commit;
