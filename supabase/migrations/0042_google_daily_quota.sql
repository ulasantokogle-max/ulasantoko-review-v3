-- V3: global 140/day hard limit; monthly 5000 is a reference, not a hard cap.
begin;
create table if not exists public.v3_google_request_usage (
  usage_date date primary key,
  requests integer not null default 0 check (requests between 0 and 140)
);
alter table public.v3_google_request_usage enable row level security;
revoke all on public.v3_google_request_usage from public, anon, authenticated;

create or replace function public.v3_reserve_google_request()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_used integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.v3_google_request_usage(usage_date) values (v_day)
    on conflict (usage_date) do nothing;
  -- Row lock serializes reservations across all users and server instances.
  select requests into v_used from public.v3_google_request_usage where usage_date = v_day for update;
  if v_used >= 140 then return jsonb_build_object('success',false); end if;
  update public.v3_google_request_usage set requests = requests + 1 where usage_date = v_day;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.v3_reserve_google_request() from public, anon;
grant execute on function public.v3_reserve_google_request() to authenticated;

create or replace function public.v3_get_google_request_usage()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_month date;
  v_daily integer;
  v_monthly integer;
  v_started date;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.v3_is_provider_admin() then raise exception 'FORBIDDEN'; end if;
  v_month := date_trunc('month',v_day::timestamp)::date;
  select coalesce(sum(requests) filter (where usage_date = v_day),0),
         coalesce(sum(requests) filter (where usage_date >= v_month and usage_date <= v_day),0), min(usage_date)
  into v_daily,v_monthly,v_started from public.v3_google_request_usage;
  return jsonb_build_object('success',true,'day',v_day,'month',v_month,
    'daily_used',v_daily,'daily_limit',140,'monthly_used',v_monthly,'monthly_reference',5000,
    'tracking_since',v_started,'blocked',v_daily >= 140);
end;
$$;
revoke all on function public.v3_get_google_request_usage() from public, anon;
grant execute on function public.v3_get_google_request_usage() to authenticated;
notify pgrst, 'reload schema';
commit;
