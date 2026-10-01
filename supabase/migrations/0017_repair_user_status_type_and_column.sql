-- UlasanToko Review V3
-- Repair missing user_status enum + users.status column in live database.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'user_status'
  ) then
    create type public.user_status as enum ('active','suspended','invited');
  end if;
end
$$;

alter table public.users
  add column if not exists status public.user_status;

update public.users
set status = 'active'::public.user_status
where status is null;

alter table public.users
  alter column status set default 'active'::public.user_status;

alter table public.users
  alter column status set not null;

notify pgrst, 'reload schema';
