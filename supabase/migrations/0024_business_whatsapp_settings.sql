-- UlasanToko Review V3
-- Contact & WhatsApp settings V1

alter table public.businesses
  add column if not exists whatsapp_number text;

create or replace function public.v3_get_business_contact_settings(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select whatsapp_number
  into v_number
  from public.businesses
  where id = p_business_id
    and status::text = 'active';

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'whatsapp_number', v_number,
    'whatsapp_url',
      case
        when v_number is null or v_number = '' then null
        else 'https://wa.me/' || v_number
      end
  );
end;
$$;

create or replace function public.v3_update_business_contact_settings(
  p_business_id uuid,
  p_whatsapp_number text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_number := regexp_replace(coalesce(p_whatsapp_number, ''), '[^0-9]', '', 'g');

  if v_number = '' then
    v_number := null;
  elsif left(v_number, 1) = '0' then
    v_number := '62' || substr(v_number, 2);
  elsif left(v_number, 2) <> '62' and left(v_number, 1) = '8' then
    v_number := '62' || v_number;
  end if;

  if v_number is not null and v_number !~ '^[0-9]{8,16}$' then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_WHATSAPP_NUMBER',
      'message', 'Nomor WhatsApp tidak valid.'
    );
  end if;

  update public.businesses
  set whatsapp_number = v_number
  where id = p_business_id
    and status::text = 'active';

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'whatsapp_number', v_number,
    'whatsapp_url',
      case
        when v_number is null then null
        else 'https://wa.me/' || v_number
      end,
    'message', 'Pengaturan WhatsApp berhasil disimpan.'
  );
end;
$$;

create or replace function public.v3_get_public_business_contact(
  p_card_code text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'success', true,
    'whatsapp_number', b.whatsapp_number,
    'whatsapp_url',
      case
        when b.whatsapp_number is null or b.whatsapp_number = '' then null
        else 'https://wa.me/' || b.whatsapp_number
      end
  )
  from public.cards c
  join public.businesses b on b.id = c.business_id
  where c.card_code = p_card_code
    and c.status::text = 'active'
    and c.activation_status::text = 'activated'
    and b.status::text = 'active'
  limit 1;
$$;

revoke all on function public.v3_get_business_contact_settings(uuid) from public;
revoke all on function public.v3_update_business_contact_settings(uuid, text) from public;
revoke all on function public.v3_get_public_business_contact(text) from public;

grant execute on function public.v3_get_business_contact_settings(uuid) to authenticated;
grant execute on function public.v3_update_business_contact_settings(uuid, text) to authenticated;
grant execute on function public.v3_get_public_business_contact(text) to anon, authenticated;

notify pgrst, 'reload schema';
