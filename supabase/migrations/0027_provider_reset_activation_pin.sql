-- UlasanToko Review V3
-- Provider can reset activation PIN only for unactivated inventory cards.

create or replace function public.v3_provider_reset_activation_pin(
  p_card_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_card public.cards%rowtype;
  v_activation_id uuid;
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

  if v_card.status::text <> 'active'
     or v_card.activation_status::text = 'activated'
     or v_card.business_id is not null then
    return jsonb_build_object(
      'success', false,
      'code', 'PIN_RESET_NOT_ALLOWED',
      'message', 'PIN can only be reset for Ready to Sell cards'
    );
  end if;

  select id
  into v_activation_id
  from public.card_activation
  where card_id = v_card.id
  for update;

  if v_activation_id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'ACTIVATION_NOT_PROVISIONED',
      'message', 'Activation record not found'
    );
  end if;

  v_pin := lpad((floor(random() * 1000000))::integer::text, 6, '0');

  update public.card_activation
  set
    pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
    attempt_count = 0,
    locked_until = null,
    activated_by = null,
    activated_at = null
  where id = v_activation_id;

  return jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_code', v_card.card_code,
    'activation_pin', v_pin,
    'message', 'Activation PIN reset successfully'
  );
end;
$$;

revoke all on function public.v3_provider_reset_activation_pin(uuid) from public;
grant execute on function public.v3_provider_reset_activation_pin(uuid) to authenticated;

notify pgrst, 'reload schema';
