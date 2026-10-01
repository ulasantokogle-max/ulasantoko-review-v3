-- UlasanToko Review V3
-- Security Hardening V1 / Stage 3B
-- Public feedback anti-spam / rate limiting and input validation.

create table if not exists public.feedback_rate_limits (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  session_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_rate_limits_card_session_time
  on public.feedback_rate_limits(card_id, session_key, created_at desc);

alter table public.feedback_rate_limits enable row level security;
revoke all privileges on table public.feedback_rate_limits from anon, authenticated;

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
  if p_rating is null or p_rating < 1 or p_rating > 3 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_RATING',
      'message', 'Rating must be between 1 and 3'
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
  limit 1;

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

notify pgrst, 'reload schema';
