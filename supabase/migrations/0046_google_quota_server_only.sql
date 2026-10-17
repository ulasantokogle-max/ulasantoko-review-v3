-- Only the V3 server may reserve Google Places quota. Preserve existing counters.
begin;
create or replace function public.v3_reserve_google_request()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
  v_used integer;
begin
  -- session role remains the PostgREST caller even inside SECURITY DEFINER.
  if current_setting('role', true) is distinct from 'service_role' then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.v3_google_request_usage(usage_date) values (v_day)
    on conflict (usage_date) do nothing;
  select requests into v_used from public.v3_google_request_usage where usage_date = v_day for update;
  if v_used >= 140 then return jsonb_build_object('success',false); end if;
  update public.v3_google_request_usage set requests = requests + 1 where usage_date = v_day;
  return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.v3_reserve_google_request() from public, anon, authenticated;
grant execute on function public.v3_reserve_google_request() to service_role;
notify pgrst, 'reload schema';
commit;
