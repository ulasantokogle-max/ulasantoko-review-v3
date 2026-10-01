-- UlasanToko Review V3
-- Repair missing landing_status enum + landing_pages.status column in live database.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'landing_status'
  ) then
    create type public.landing_status as enum ('active','archived');
  end if;
end
$$;

alter table public.landing_pages
  add column if not exists status public.landing_status;

update public.landing_pages
set status = 'active'::public.landing_status
where status is null;

alter table public.landing_pages
  alter column status set default 'active'::public.landing_status;

alter table public.landing_pages
  alter column status set not null;

notify pgrst, 'reload schema';
