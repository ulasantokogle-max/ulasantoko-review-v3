-- UlasanToko Review V3
-- Card Management V1: secure card listing and basic card metadata updates.

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
  where c.business_id = p_business_id
  order by c.created_at desc;
end;
$$;

revoke all on function public.v3_get_cards(uuid) from public;
grant execute on function public.v3_get_cards(uuid) to authenticated;

create or replace function public.v3_update_card(
  p_card_id uuid,
  p_label text,
  p_area text,
  p_status public.card_operational_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_card
  from public.cards
  where id = p_card_id
  limit 1;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found'
    );
  end if;

  if not public.is_business_member(v_card.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.cards
  set
    label = nullif(btrim(coalesce(p_label, '')), ''),
    area = nullif(btrim(coalesce(p_area, '')), ''),
    status = p_status
  where id = p_card_id;

  return jsonb_build_object(
    'success', true,
    'card_id', p_card_id,
    'label', nullif(btrim(coalesce(p_label, '')), ''),
    'area', nullif(btrim(coalesce(p_area, '')), ''),
    'status', p_status
  );
end;
$$;

revoke all on function public.v3_update_card(uuid, text, text, public.card_operational_status) from public;
grant execute on function public.v3_update_card(uuid, text, text, public.card_operational_status) to authenticated;

notify pgrst, 'reload schema';
