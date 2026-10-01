-- UlasanToko Review V3
-- Repair schema drift: public.users is missing the status column expected by V3 RPCs.

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
