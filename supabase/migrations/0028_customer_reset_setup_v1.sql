-- UlasanToko Review V3
-- Customer Reset Setup V1
-- Resets business setup for a card the authenticated customer already owns.
-- Ownership, card activation, feedback, analytics, and history are preserved.

create or replace function public.v3_customer_reset_card_setup(
  p_card_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_business public.businesses%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_card
  from public.cards
  where id = p_card_id
  for update;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found'
    );
  end if;

  if v_card.business_id is null
     or v_card.activation_status::text <> 'activated' then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_ACTIVATED',
      'message', 'Only activated cards can reset setup'
    );
  end if;

  if not public.is_business_member(v_card.business_id) then
    raise exception 'FORBIDDEN';
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
      'message', 'Business not found'
    );
  end if;

  -- Clear business contact setup.
  update public.businesses
  set whatsapp_number = null
  where id = v_business.id;

  -- Keep the profile row/history identity, but clear active Google Review config.
  update public.google_review_profiles
  set
    maps_url = null,
    place_id = null,
    review_url = null,
    business_name = null
  where business_id = v_business.id;

  -- Keep ownership/card activation and all feedback/analytics intact.
  insert into public.audit_logs (
    organization_id,
    business_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  values (
    v_business.organization_id,
    v_business.id,
    auth.uid(),
    'customer_reset_card_setup',
    'card',
    v_card.id,
    jsonb_build_object(
      'card_code', v_card.card_code,
      'preserved_ownership', true,
      'preserved_feedback', true,
      'preserved_analytics', true
    )
  );

  return jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_code', v_card.card_code,
    'business_id', v_business.id,
    'message', 'Setup kartu berhasil direset. Kepemilikan dan data feedback tetap aman.'
  );
end;
$$;

revoke all on function public.v3_customer_reset_card_setup(uuid) from public;
grant execute on function public.v3_customer_reset_card_setup(uuid) to authenticated;

notify pgrst, 'reload schema';
