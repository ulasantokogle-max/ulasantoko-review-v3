-- UlasanToko Review V3
-- Provider Factory Reset / Transfer Ownership V1
-- Releases an activated card from its current business and issues a new activation PIN.
-- Old business data, feedback, analytics, and history are preserved.

create or replace function public.v3_provider_factory_reset_card(
  p_card_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_card public.cards%rowtype;
  v_activation public.card_activation%rowtype;
  v_from_business_id uuid;
  v_pin text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
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

  if v_card.activation_status::text <> 'activated'
     or v_card.business_id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'FACTORY_RESET_NOT_ALLOWED',
      'message', 'Only activated cards with an owner can be factory reset'
    );
  end if;

  v_from_business_id := v_card.business_id;

  select *
  into v_activation
  from public.card_activation
  where card_id = v_card.id
  for update;

  if v_activation.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'ACTIVATION_NOT_PROVISIONED',
      'message', 'Activation record not found'
    );
  end if;

  v_pin := lpad((floor(random() * 1000000))::integer::text, 6, '0');

  update public.cards
  set
    business_id = null,
    activation_status = 'unassigned',
    activated_at = null
  where id = v_card.id;

  update public.card_activation
  set
    pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
    attempt_count = 0,
    locked_until = null,
    activated_by = null,
    activated_at = null
  where id = v_activation.id;

  insert into public.card_transfer_history (
    card_id,
    from_business_id,
    to_business_id,
    initiated_by,
    confirmed_by,
    reason,
    transferred_at
  )
  values (
    v_card.id,
    v_from_business_id,
    null,
    auth.uid(),
    auth.uid(),
    coalesce(nullif(btrim(p_reason), ''), 'Provider factory reset / release'),
    now()
  );

  insert into public.audit_logs (
    organization_id,
    business_id,
    user_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  select
    b.organization_id,
    v_from_business_id,
    auth.uid(),
    'provider_factory_reset_card',
    'card',
    v_card.id,
    jsonb_build_object(
      'card_code', v_card.card_code,
      'from_business_id', v_from_business_id,
      'preserved_business_data', true,
      'preserved_feedback', true,
      'preserved_analytics', true
    )
  from public.businesses b
  where b.id = v_from_business_id;

  return jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_code', v_card.card_code,
    'previous_business_id', v_from_business_id,
    'activation_pin', v_pin,
    'inventory_status', 'ready_to_sell',
    'message', 'Card released and ready for a new owner'
  );
end;
$$;

revoke all on function public.v3_provider_factory_reset_card(uuid, text) from public;
grant execute on function public.v3_provider_factory_reset_card(uuid, text) to authenticated;

notify pgrst, 'reload schema';
