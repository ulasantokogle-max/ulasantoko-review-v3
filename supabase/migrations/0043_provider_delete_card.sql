-- ReputasiPro V3: provider-only card deletion (retained history).
-- Requires 0039 provider MFA and 0041 public IDs. No existing cards are deleted on install.
begin;
alter table public.cards add column if not exists deleted_at timestamptz;

create or replace function public.v3_guard_deleted_card()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.deleted_at is not null then raise exception 'CARD_DELETED'; end if;
  if new.deleted_at is not null and new.status <> 'retired' then
    raise exception 'DELETED_CARD_MUST_BE_RETIRED';
  end if;
  return new;
end;
$$;
revoke all on function public.v3_guard_deleted_card() from public, anon, authenticated;
drop trigger if exists v3_guard_deleted_card on public.cards;
create trigger v3_guard_deleted_card before update on public.cards
for each row execute function public.v3_guard_deleted_card();

create or replace function public.v3_provider_delete_card(p_card_id uuid, p_confirm_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_card public.cards%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.v3_is_provider_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_card from public.cards where id = p_card_id for update;
  if not found or v_card.deleted_at is not null then
    return jsonb_build_object('success', false, 'code', 'CARD_NOT_FOUND');
  end if;
  if p_confirm_code is null or btrim(p_confirm_code) <> v_card.card_code then
    return jsonb_build_object('success', false, 'code', 'CONFIRMATION_REQUIRED');
  end if;
  update public.cards set status = 'retired', deleted_at = now() where id = p_card_id;
  update public.card_provisioning set qr_enabled = false, nfc_enabled = false where card_id = p_card_id;
  insert into public.audit_logs(business_id, user_id, action, entity_type, entity_id, metadata)
  values(v_card.business_id, auth.uid(), 'provider_delete_card', 'card', p_card_id,
    jsonb_build_object('card_code', v_card.card_code, 'previous_status', v_card.status,
      'activation_status', v_card.activation_status));
  return jsonb_build_object('success', true, 'card_id', p_card_id);
end;
$$;
revoke all on function public.v3_provider_delete_card(uuid,text) from public, anon;
grant execute on function public.v3_provider_delete_card(uuid,text) to authenticated;


create or replace function public.v3_provider_list_cards(
  p_limit integer default 100
)
returns table (
  id uuid,
  card_code text,
  label text,
  area text,
  internal_code text,
  operational_status text,
  activation_status text,
  business_id uuid,
  business_name text,
  qr_url text,
  qr_enabled boolean,
  nfc_enabled boolean,
  nfc_identifier text,
  inventory_status text,
  created_at timestamptz,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    c.id,
    c.card_code,
    c.label,
    c.area,
    c.internal_code,
    c.status::text,
    c.activation_status::text,
    c.business_id,
    coalesce(nullif(b.display_name, ''), b.name),
    cp.qr_url,
    cp.qr_enabled,
    cp.nfc_enabled,
    cp.nfc_identifier,
    case
      when c.activation_status::text = 'activated' then 'activated'
      when c.business_id is null then 'ready_to_sell'
      else 'assigned'
    end,
    c.created_at,
    c.activated_at
  from public.cards c
  left join public.businesses b on b.id = c.business_id
  left join public.card_provisioning cp on cp.card_id = c.id
  where c.deleted_at is null
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.v3_provider_list_cards(integer) from public;
grant execute on function public.v3_provider_list_cards(integer) to authenticated;



create or replace function public.v3_get_cards(
  p_business_id uuid
)
returns table (
  id uuid,
  card_code text,
  label text,
  area text,
  internal_code text,
  status public.card_operational_status,
  activation_status public.card_activation_status,
  qr_enabled boolean,
  qr_url text,
  nfc_enabled boolean,
  nfc_identifier text,
  created_at timestamptz,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    c.id,
    c.card_code,
    c.label,
    c.area,
    c.internal_code,
    c.status,
    c.activation_status,
    cp.qr_enabled,
    cp.qr_url,
    cp.nfc_enabled,
    cp.nfc_identifier,
    c.created_at,
    c.activated_at
  from public.cards c
  left join public.card_provisioning cp on cp.card_id = c.id
  where c.business_id = p_business_id and c.deleted_at is null
  order by c.created_at desc;
end;
$$;

revoke all on function public.v3_get_cards(uuid) from public;
grant execute on function public.v3_get_cards(uuid) to authenticated;


-- UlasanToko Review V3
-- Analytics Dashboard V1

create or replace function public.v3_get_business_analytics(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_feedback integer;
  v_avg_rating numeric;
  v_rating_1 integer;
  v_rating_2 integer;
  v_rating_3 integer;
  v_new integer;
  v_viewed integer;
  v_contacted integer;
  v_resolved integer;
  v_closed integer;
  v_contactable integer;
  v_last_7_days integer;
  v_last_30_days integer;
  v_total_cards integer;
  v_active_cards integer;
  v_activated_cards integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select
    count(*)::integer,
    coalesce(round(avg(rating)::numeric, 2), 0),
    count(*) filter (where rating = 1)::integer,
    count(*) filter (where rating = 2)::integer,
    count(*) filter (where rating = 3)::integer,
    count(*) filter (where status::text = 'new')::integer,
    count(*) filter (where status::text = 'viewed')::integer,
    count(*) filter (where status::text = 'contacted')::integer,
    count(*) filter (where status::text = 'resolved')::integer,
    count(*) filter (where status::text = 'closed')::integer,
    count(*) filter (
      where contact_consent = true
        and nullif(btrim(coalesce(customer_phone, '')), '') is not null
    )::integer,
    count(*) filter (where created_at >= now() - interval '7 days')::integer,
    count(*) filter (where created_at >= now() - interval '30 days')::integer
  into
    v_total_feedback,
    v_avg_rating,
    v_rating_1,
    v_rating_2,
    v_rating_3,
    v_new,
    v_viewed,
    v_contacted,
    v_resolved,
    v_closed,
    v_contactable,
    v_last_7_days,
    v_last_30_days
  from public.feedback_submissions
  where business_id = p_business_id;

  select
    count(*)::integer,
    count(*) filter (where status::text = 'active')::integer,
    count(*) filter (where activation_status::text = 'activated')::integer
  into
    v_total_cards,
    v_active_cards,
    v_activated_cards
  from public.cards
  where business_id = p_business_id and deleted_at is null;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'feedback', jsonb_build_object(
      'total', coalesce(v_total_feedback, 0),
      'average_rating', coalesce(v_avg_rating, 0),
      'rating_1', coalesce(v_rating_1, 0),
      'rating_2', coalesce(v_rating_2, 0),
      'rating_3', coalesce(v_rating_3, 0),
      'new', coalesce(v_new, 0),
      'viewed', coalesce(v_viewed, 0),
      'contacted', coalesce(v_contacted, 0),
      'resolved', coalesce(v_resolved, 0),
      'closed', coalesce(v_closed, 0),
      'contactable', coalesce(v_contactable, 0),
      'last_7_days', coalesce(v_last_7_days, 0),
      'last_30_days', coalesce(v_last_30_days, 0)
    ),
    'cards', jsonb_build_object(
      'total', coalesce(v_total_cards, 0),
      'active', coalesce(v_active_cards, 0),
      'activated', coalesce(v_activated_cards, 0)
    )
  );
end;
$$;

revoke all on function public.v3_get_business_analytics(uuid) from public;
grant execute on function public.v3_get_business_analytics(uuid) to authenticated;



-- ReputasiPro
-- Analytics period filter V1
-- Supports hour, day, week, month, and custom date/time ranges.

create or replace function public.v3_get_business_analytics_period(
  p_business_id uuid,
  p_period text default 'day',
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_timezone text default 'Asia/Jakarta'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_total_feedback integer;
  v_avg_rating numeric;
  v_rating_1 integer;
  v_rating_2 integer;
  v_rating_3 integer;
  v_new integer;
  v_viewed integer;
  v_contacted integer;
  v_resolved integer;
  v_closed integer;
  v_contactable integer;
  v_total_cards integer;
  v_active_cards integer;
  v_activated_cards integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  case lower(coalesce(p_period, 'day'))
    when 'hour' then
      v_start_at := date_trunc('hour', now() at time zone p_timezone) at time zone p_timezone;
      v_end_at := v_start_at + interval '1 hour';
    when 'day' then
      v_start_at := date_trunc('day', now() at time zone p_timezone) at time zone p_timezone;
      v_end_at := v_start_at + interval '1 day';
    when 'week' then
      v_start_at := date_trunc('week', now() at time zone p_timezone) at time zone p_timezone;
      v_end_at := v_start_at + interval '1 week';
    when 'month' then
      v_start_at := date_trunc('month', now() at time zone p_timezone) at time zone p_timezone;
      v_end_at := (date_trunc('month', now() at time zone p_timezone) + interval '1 month') at time zone p_timezone;
    when 'custom' then
      if p_start_at is null or p_end_at is null or p_end_at <= p_start_at then
        raise exception 'INVALID_CUSTOM_RANGE';
      end if;
      v_start_at := p_start_at;
      v_end_at := p_end_at;
    else
      raise exception 'INVALID_PERIOD';
  end case;

  select
    count(*)::integer,
    coalesce(round(avg(rating)::numeric, 2), 0),
    count(*) filter (where rating = 1)::integer,
    count(*) filter (where rating = 2)::integer,
    count(*) filter (where rating = 3)::integer,
    count(*) filter (where status::text = 'new')::integer,
    count(*) filter (where status::text = 'viewed')::integer,
    count(*) filter (where status::text = 'contacted')::integer,
    count(*) filter (where status::text = 'resolved')::integer,
    count(*) filter (where status::text = 'closed')::integer,
    count(*) filter (
      where contact_consent = true
        and nullif(btrim(coalesce(customer_phone, '')), '') is not null
    )::integer
  into
    v_total_feedback,
    v_avg_rating,
    v_rating_1,
    v_rating_2,
    v_rating_3,
    v_new,
    v_viewed,
    v_contacted,
    v_resolved,
    v_closed,
    v_contactable
  from public.feedback_submissions
  where business_id = p_business_id
    and created_at >= v_start_at
    and created_at < v_end_at;

  select
    count(*)::integer,
    count(*) filter (where status::text = 'active')::integer,
    count(*) filter (where activation_status::text = 'activated')::integer
  into
    v_total_cards,
    v_active_cards,
    v_activated_cards
  from public.cards
  where business_id = p_business_id and deleted_at is null;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'period', lower(coalesce(p_period, 'day')),
    'timezone', p_timezone,
    'start_at', v_start_at,
    'end_at', v_end_at,
    'feedback', jsonb_build_object(
      'total', coalesce(v_total_feedback, 0),
      'average_rating', coalesce(v_avg_rating, 0),
      'rating_1', coalesce(v_rating_1, 0),
      'rating_2', coalesce(v_rating_2, 0),
      'rating_3', coalesce(v_rating_3, 0),
      'new', coalesce(v_new, 0),
      'viewed', coalesce(v_viewed, 0),
      'contacted', coalesce(v_contacted, 0),
      'resolved', coalesce(v_resolved, 0),
      'closed', coalesce(v_closed, 0),
      'contactable', coalesce(v_contactable, 0)
    ),
    'cards', jsonb_build_object(
      'total', coalesce(v_total_cards, 0),
      'active', coalesce(v_active_cards, 0),
      'activated', coalesce(v_activated_cards, 0)
    )
  );
end;
$$;

revoke all on function public.v3_get_business_analytics_period(uuid, text, timestamptz, timestamptz, text) from public;
grant execute on function public.v3_get_business_analytics_period(uuid, text, timestamptz, timestamptz, text) to authenticated;



create or replace function public.v3_get_card_activation_state(
  p_card_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_card public.cards%rowtype;
begin
  select *
  into v_card
  from public.cards
  where card_code = p_card_code and deleted_at is null
  limit 1;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_code', v_card.card_code,
    'status', v_card.status::text,
    'activation_status', v_card.activation_status::text,
    'business_id', v_card.business_id,
    'needs_activation', v_card.activation_status::text <> 'activated'
  );
end;
$$;

revoke all on function public.v3_get_card_activation_state(text) from public;
grant execute on function public.v3_get_card_activation_state(text) to anon, authenticated;


notify pgrst, 'reload schema';
commit;
