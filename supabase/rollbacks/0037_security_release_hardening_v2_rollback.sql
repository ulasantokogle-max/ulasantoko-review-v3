-- Restore definitions/configuration captured before 0037. Does not delete submissions or files.
begin;
do $$ declare r record;
begin
 if to_regclass('backup_20261003.function_definitions') is null then
   raise exception 'Missing pre-security V2 checkpoint';
 end if;
 for r in select definition from backup_20261003.function_definitions loop
   execute r.definition;
 end loop;
end $$;
update storage.buckets b set file_size_limit=s.file_size_limit,allowed_mime_types=s.allowed_mime_types
from backup_20261003.bucket_settings s where b.id=s.id;
drop function if exists public.v3_generate_activation_pin();
commit;
notify pgrst, 'reload schema';
