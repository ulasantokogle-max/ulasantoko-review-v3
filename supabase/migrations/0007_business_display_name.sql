-- UlasanToko Review V3
-- Public display name support + secure owner edit RPC.

alter table public.businesses
add column if not exists display_name text;

update public.businesses
set display_name = 'PT Mustika Jaya Herbal'
where id = '99438efc-aeb4-436a-b0c6-90b0a1832674'::uuid
  and (display_name is null or btrim(display_name) = '');

create or replace function public.v3_get_business_profile(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select *
  into v_business
  from public.businesses
  where id = p_business_id
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'BUSINESS_NOT_FOUND'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'business_id', v_business.id,
    'internal_name', v_business.name,
    'display_name', coalesce(nullif(btrim(v_business.display_name), ''), v_business.name),
    'category', v_business.category
  );
end;
$$;

revoke all on function public.v3_get_business_profile(uuid) from public;
grant execute on function public.v3_get_business_profile(uuid) to authenticated;

create or replace function public.v3_update_business_display_name(
  p_business_id uuid,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_name := nullif(btrim(coalesce(p_display_name, '')), '');

  if v_name is null then
    return jsonb_build_object(
      'success', false,
      'code', 'DISPLAY_NAME_REQUIRED',
      'message', 'Public business name is required'
    );
  end if;

  update public.businesses
  set display_name = v_name
  where id = p_business_id;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'display_name', v_name
  );
end;
$$;

revoke all on function public.v3_update_business_display_name(uuid, text) from public;
grant execute on function public.v3_update_business_display_name(uuid, text) to authenticated;

create or replace function public.v3_get_public_business_name(
  p_card_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses%rowtype;
begin
  select b.*
  into v_business
  from public.cards c
  join public.businesses b on b.id = c.business_id
  where c.card_code = p_card_code
    and c.status = 'active'
    and b.status = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'business_id', v_business.id,
    'display_name', coalesce(nullif(btrim(v_business.display_name), ''), v_business.name),
    'internal_name', v_business.name
  );
end;
$$;

revoke all on function public.v3_get_public_business_name(text) from public;
grant execute on function public.v3_get_public_business_name(text) to anon, authenticated;
