-- Additive annual tracking. Existing businesses/cards and public QR/NFC access are unchanged.
begin;
create table if not exists public.v3_business_terms (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  expires_on date not null,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.v3_business_term_events (
  request_id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider_id uuid not null,
  previous_expires_on date,
  expires_on date not null,
  revision integer not null,
  created_at timestamptz not null default now()
);
alter table public.v3_business_terms enable row level security;
alter table public.v3_business_term_events enable row level security;
revoke all on public.v3_business_terms, public.v3_business_term_events from public, anon, authenticated;

create or replace function public.v3_get_business_term(p_business_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_term public.v3_business_terms%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_business_member(p_business_id) then raise exception 'FORBIDDEN'; end if;
  select * into v_term from public.v3_business_terms where business_id = p_business_id;
  if not found then return jsonb_build_object('success',true,'enabled',false); end if;
  return jsonb_build_object('success',true,'enabled',true,'expires_on',v_term.expires_on,
    'days_remaining',v_term.expires_on - (now() at time zone 'Asia/Jakarta')::date);
end;
$$;

create or replace function public.v3_provider_list_business_terms()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.v3_is_provider_admin() then raise exception 'FORBIDDEN'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,
    'business_name',coalesce(nullif(b.display_name,''),b.name),'expires_on',t.expires_on,
    'revision',coalesce(t.revision,0),'days_remaining',t.expires_on - (now() at time zone 'Asia/Jakarta')::date)
    order by coalesce(t.expires_on,'infinity'::date),b.created_at)
    from public.businesses b left join public.v3_business_terms t on t.business_id=b.id
    where b.status='active'), '[]'::jsonb);
end;
$$;

create or replace function public.v3_provider_renew_business_year(
  p_business_id uuid, p_expected_revision integer, p_request_id uuid
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_term public.v3_business_terms%rowtype;
  v_event public.v3_business_term_events%rowtype;
  v_new date;
  v_revision integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.v3_is_provider_admin() then raise exception 'FORBIDDEN'; end if;
  if p_request_id is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'INVALID_REQUEST'; end if;
  -- Business row serializes first activation and all subsequent renewals.
  perform 1 from public.businesses where id=p_business_id and status='active' for update;
  if not found then raise exception 'BUSINESS_NOT_FOUND'; end if;
  select * into v_event from public.v3_business_term_events where request_id=p_request_id;
  if found then
    if v_event.business_id <> p_business_id then raise exception 'INVALID_REQUEST'; end if;
    return jsonb_build_object('success',true,'expires_on',v_event.expires_on,'revision',v_event.revision);
  end if;
  select * into v_term from public.v3_business_terms where business_id=p_business_id;
  if coalesce(v_term.revision,0) <> p_expected_revision then
    return jsonb_build_object('success',false,'code','STALE_TERM');
  end if;
  v_new := (greatest(v_term.expires_on,(now() at time zone 'Asia/Jakarta')::date) + interval '1 year')::date;
  v_revision := coalesce(v_term.revision,0)+1;
  insert into public.v3_business_terms(business_id,expires_on,revision) values(p_business_id,v_new,v_revision)
    on conflict(business_id) do update set expires_on=excluded.expires_on,revision=excluded.revision,updated_at=now();
  insert into public.v3_business_term_events(request_id,business_id,provider_id,previous_expires_on,expires_on,revision)
    values(p_request_id,p_business_id,auth.uid(),v_term.expires_on,v_new,v_revision);
  return jsonb_build_object('success',true,'expires_on',v_new,'revision',v_revision);
end;
$$;
revoke all on function public.v3_get_business_term(uuid) from public, anon;
revoke all on function public.v3_provider_list_business_terms() from public, anon;
revoke all on function public.v3_provider_renew_business_year(uuid,integer,uuid) from public, anon;
grant execute on function public.v3_get_business_term(uuid) to authenticated;
grant execute on function public.v3_provider_list_business_terms() to authenticated;
grant execute on function public.v3_provider_renew_business_year(uuid,integer,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
