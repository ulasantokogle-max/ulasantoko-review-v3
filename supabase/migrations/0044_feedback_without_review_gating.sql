-- ReputasiPro V3 only. Run after 0043. No existing feedback is removed.
begin;
do $$
declare v_constraint record; v_rating_column smallint;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cards' and column_name='deleted_at') then
    raise exception 'Apply V3 migration 0043 before 0044';
  end if;
  select attnum into v_rating_column from pg_attribute
    where attrelid='public.feedback_submissions'::regclass and attname='rating' and not attisdropped;
  if v_rating_column is null then raise exception 'Missing V3 feedback rating column'; end if;
  -- Replace rating-only checks regardless of their name on the live database.
  for v_constraint in select conname from pg_constraint where conrelid='public.feedback_submissions'::regclass
    and contype='c' and conkey=array[v_rating_column] loop
    execute format('alter table public.feedback_submissions drop constraint %I',v_constraint.conname);
  end loop;
end $$;
alter table public.feedback_submissions add constraint feedback_submissions_rating_check check (rating between 1 and 5);

create or replace function public.v3_submit_feedback(
  p_card_code text,
  p_rating smallint,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_message text default null,
  p_category text default null,
  p_contact_consent boolean default false,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_business public.businesses%rowtype;
  v_feedback_id uuid;
  v_session_key text;
  v_recent_count integer;
  v_name text;
  v_phone text;
  v_message text;
  v_category text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_RATING',
      'message', 'Rating must be between 1 and 5'
    );
  end if;

  v_name := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_phone := nullif(btrim(coalesce(p_customer_phone, '')), '');
  v_message := nullif(btrim(coalesce(p_message, '')), '');
  v_category := nullif(btrim(coalesce(p_category, '')), '');

  if v_name is not null and length(v_name) > 120 then
    return jsonb_build_object('success', false, 'code', 'NAME_TOO_LONG', 'message', 'Customer name is too long');
  end if;

  if v_phone is not null and length(v_phone) > 32 then
    return jsonb_build_object('success', false, 'code', 'PHONE_TOO_LONG', 'message', 'Phone number is too long');
  end if;

  if v_message is not null and length(v_message) > 2000 then
    return jsonb_build_object('success', false, 'code', 'MESSAGE_TOO_LONG', 'message', 'Feedback message is too long');
  end if;

  if v_category is not null and length(v_category) > 80 then
    return jsonb_build_object('success', false, 'code', 'CATEGORY_TOO_LONG', 'message', 'Feedback category is too long');
  end if;

  select *
  into v_card
  from public.cards
  where card_code = p_card_code
    and status::text = 'active'
  limit 1
  for update;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found or inactive'
    );
  end if;

  select *
  into v_business
  from public.businesses
  where id = v_card.business_id
    and status::text = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'BUSINESS_NOT_FOUND',
      'message', 'Business not found or inactive'
    );
  end if;

  -- The card row lock serializes concurrent submissions, including direct RPC calls.
  -- Card-wide throttling cannot be bypassed by rotating browser session IDs.
  select count(*) into v_recent_count
  from public.feedback_rate_limits r
  where r.card_id = v_card.id
    and r.created_at >= now() - interval '10 minutes';
  if v_recent_count >= 30 then
    return jsonb_build_object('success', false, 'code', 'FEEDBACK_RATE_LIMITED',
      'message', 'Too many feedback submissions. Please try again later.');
  end if;

  -- Session-based public throttling. Public clients must send a stable random session_id.
  -- If missing, fall back to a conservative anonymous bucket per card.
  v_session_key := coalesce(nullif(btrim(coalesce(p_session_id, '')), ''), 'anonymous');

  if length(v_session_key) > 160 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_SESSION',
      'message', 'Invalid session identifier'
    );
  end if;

  select count(*)
  into v_recent_count
  from public.feedback_rate_limits r
  where r.card_id = v_card.id
    and r.session_key = v_session_key
    and r.created_at >= now() - interval '10 minutes';

  if v_recent_count >= 3 then
    return jsonb_build_object(
      'success', false,
      'code', 'FEEDBACK_RATE_LIMITED',
      'message', 'Too many feedback submissions. Please wait a few minutes and try again.'
    );
  end if;

  -- Reject exact duplicates from the same card/session during the last minute.
  if exists (
    select 1
    from public.feedback_submissions f
    where f.card_id = v_card.id
      and f.created_at >= now() - interval '1 minute'
      and coalesce(f.message, '') = coalesce(v_message, '')
      and f.rating = p_rating
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_FEEDBACK',
      'message', 'This feedback was already submitted.'
    );
  end if;

  insert into public.feedback_rate_limits(card_id, session_key)
  values (v_card.id, v_session_key);

  insert into public.feedback_submissions (
    organization_id,
    business_id,
    card_id,
    rating,
    customer_name,
    customer_phone,
    message,
    category,
    contact_consent,
    status
  )
  values (
    v_business.organization_id,
    v_business.id,
    v_card.id,
    p_rating,
    v_name,
    v_phone,
    v_message,
    v_category,
    coalesce(p_contact_consent, false),
    'new'
  )
  returning id into v_feedback_id;

  insert into public.interaction_events (
    organization_id,
    business_id,
    card_id,
    session_id,
    event_type,
    source,
    metadata
  )
  values (
    v_business.organization_id,
    v_business.id,
    v_card.id,
    nullif(v_session_key, 'anonymous'),
    'feedback_submit',
    'public_card',
    jsonb_build_object(
      'rating', p_rating,
      'feedback_id', v_feedback_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'message', 'Feedback saved'
  );
end;
$$;

revoke all on function public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean, text
) from public;

grant execute on function public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean, text
) to anon, authenticated;

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
  v_rating_4 integer;
  v_rating_5 integer;
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
    count(*) filter (where rating = 4)::integer,
    count(*) filter (where rating = 5)::integer,
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
    v_rating_4,
    v_rating_5,
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
      'rating_4', coalesce(v_rating_4, 0),
      'rating_5', coalesce(v_rating_5, 0),
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
  v_rating_4 integer;
  v_rating_5 integer;
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
    count(*) filter (where rating = 4)::integer,
    count(*) filter (where rating = 5)::integer,
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
    v_rating_4,
    v_rating_5,
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
      'rating_4', coalesce(v_rating_4, 0),
      'rating_5', coalesce(v_rating_5, 0),
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



-- Readiness marker contains no customer/business data. The public UI enables
-- private ratings only once the entire transaction commits successfully.
create or replace function public.v3_get_feedback_capabilities()
returns jsonb language sql stable set search_path=public as $$
  select jsonb_build_object('private_rating_max',5);
$$;
revoke all on function public.v3_get_feedback_capabilities() from public;
grant execute on function public.v3_get_feedback_capabilities() to anon,authenticated;
notify pgrst, 'reload schema';
commit;
