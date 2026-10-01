-- UlasanToko Review V3
-- Fix public feedback RPC after 0002.
-- Canonicalizes the function signature and writes analytics to interaction_events.

drop function if exists public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean
);

drop function if exists public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean, text
);

create function public.v3_submit_feedback(
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
begin
  if p_rating is null or p_rating < 1 or p_rating > 3 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_RATING',
      'message', 'Rating must be between 1 and 3'
    );
  end if;

  select *
  into v_card
  from public.cards
  where card_code = p_card_code
    and status = 'active'
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
    and status = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'BUSINESS_NOT_FOUND',
      'message', 'Business not found or inactive'
    );
  end if;

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
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_message, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
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
    nullif(trim(coalesce(p_session_id, '')), ''),
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
