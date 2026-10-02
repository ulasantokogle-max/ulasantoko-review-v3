-- ReputasiPro
-- Analytics period filter V1
-- Supports hour, day, week, month, and custom date/time ranges.

create or replace function public.v3_get_business_analytics_period(
  p_business_id uuid,
  p_period text default 'day',
  p_start_at timestamptz default null,
  p_end_at timestamptz default null
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
      v_start_at := date_trunc('hour', now());
      v_end_at := v_start_at + interval '1 hour';
    when 'day' then
      v_start_at := date_trunc('day', now());
      v_end_at := v_start_at + interval '1 day';
    when 'week' then
      v_start_at := date_trunc('week', now());
      v_end_at := v_start_at + interval '1 week';
    when 'month' then
      v_start_at := date_trunc('month', now());
      v_end_at := v_start_at + interval '1 month';
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
  where business_id = p_business_id;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'period', lower(coalesce(p_period, 'day')),
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

revoke all on function public.v3_get_business_analytics_period(uuid, text, timestamptz, timestamptz) from public;
grant execute on function public.v3_get_business_analytics_period(uuid, text, timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
