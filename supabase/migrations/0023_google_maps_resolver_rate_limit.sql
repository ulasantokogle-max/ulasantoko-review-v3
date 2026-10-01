-- UlasanToko Review V3
-- Security Hardening V1 / Stage 3C
-- Authenticated Google Maps resolver rate limiting.

create table if not exists public.google_maps_resolver_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_google_maps_resolver_attempts_user_time
  on public.google_maps_resolver_attempts(user_id, created_at desc);

alter table public.google_maps_resolver_attempts enable row level security;
revoke all privileges on table public.google_maps_resolver_attempts from anon, authenticated;

create or replace function public.v3_check_google_maps_resolver_rate_limit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select count(*)
  into v_count
  from public.google_maps_resolver_attempts a
  where a.user_id = v_uid
    and a.created_at >= now() - interval '10 minutes';

  if v_count >= 10 then
    return jsonb_build_object(
      'success', false,
      'code', 'GOOGLE_MAPS_RATE_LIMITED',
      'message', 'Too many Google Maps lookups. Please wait a few minutes and try again.'
    );
  end if;

  insert into public.google_maps_resolver_attempts(user_id)
  values (v_uid);

  return jsonb_build_object(
    'success', true,
    'remaining', greatest(0, 9 - v_count)
  );
end;
$$;

revoke all on function public.v3_check_google_maps_resolver_rate_limit() from public;
grant execute on function public.v3_check_google_maps_resolver_rate_limit() to authenticated;

notify pgrst, 'reload schema';
