-- UlasanToko Review V3
-- Provider Card Factory / Inventory V1.
-- Provider creates pre-provisioned QR + NFC cards before customer ownership.

create table if not exists public.provider_admins (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

-- Current provider account used during V3 development.
insert into public.provider_admins (user_id, status)
values ('10efbe80-21ab-470d-aafb-43c33fedf612'::uuid, 'active')
on conflict (user_id) do update set status = excluded.status;

create sequence if not exists public.v3_card_code_seq
  start with 1000
  increment by 1
  minvalue 1;

create or replace function public.v3_is_provider_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_admins pa
    where pa.user_id = auth.uid()
      and pa.status = 'active'
  );
$$;

revoke all on function public.v3_is_provider_admin() from public;
grant execute on function public.v3_is_provider_admin() to authenticated;

create or replace function public.v3_provider_create_card(
  p_label text default null,
  p_area text default null,
  p_internal_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_card_id uuid;
  v_card_code text;
  v_pin text;
  v_url text;
  v_attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
  end if;

  loop
    v_attempts := v_attempts + 1;

    v_card_code := 'ULAS-' ||
      lpad(nextval('public.v3_card_code_seq')::text, 5, '0');

    exit when not exists (
      select 1 from public.cards where card_code = v_card_code
    );

    if v_attempts >= 10 then
      raise exception 'CARD_CODE_GENERATION_FAILED';
    end if;
  end loop;

  v_pin := lpad((floor(random() * 1000000))::integer::text, 6, '0');
  v_url := 'https://ulasantoko-review-v3.vercel.app/' || v_card_code;

  insert into public.cards (
    business_id,
    card_code,
    label,
    area,
    internal_code,
    status,
    activation_status
  )
  values (
    null,
    v_card_code,
    nullif(btrim(coalesce(p_label, '')), ''),
    nullif(btrim(coalesce(p_area, '')), ''),
    nullif(btrim(coalesce(p_internal_code, '')), ''),
    'active',
    'unassigned'
  )
  returning id into v_card_id;

  insert into public.card_activation (
    card_id,
    pin_hash,
    attempt_count
  )
  values (
    v_card_id,
    extensions.crypt(v_pin, extensions.gen_salt('bf')),
    0
  );

  insert into public.card_provisioning (
    card_id,
    qr_enabled,
    qr_url,
    qr_foreground_color,
    qr_background_color,
    qr_error_correction,
    nfc_enabled,
    nfc_identifier
  )
  values (
    v_card_id,
    true,
    v_url,
    '#000000',
    '#FFFFFF',
    'M',
    true,
    null
  );

  return jsonb_build_object(
    'success', true,
    'card_id', v_card_id,
    'card_code', v_card_code,
    'activation_pin', v_pin,
    'qr_url', v_url,
    'nfc_url', v_url,
    'inventory_status', 'ready_to_sell',
    'message', 'Card created and ready to sell'
  );
end;
$$;

revoke all on function public.v3_provider_create_card(text, text, text) from public;
grant execute on function public.v3_provider_create_card(text, text, text) to authenticated;

create or replace function public.v3_provider_list_cards(
  p_limit integer default 100
)
returns table (
  id uuid,
  card_code text,
  label text,
  area text,
  internal_code text,
  operational_status text,
  activation_status text,
  business_id uuid,
  business_name text,
  qr_url text,
  qr_enabled boolean,
  nfc_enabled boolean,
  nfc_identifier text,
  inventory_status text,
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

  if not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    c.id,
    c.card_code,
    c.label,
    c.area,
    c.internal_code,
    c.status::text,
    c.activation_status::text,
    c.business_id,
    coalesce(nullif(b.display_name, ''), b.name),
    cp.qr_url,
    cp.qr_enabled,
    cp.nfc_enabled,
    cp.nfc_identifier,
    case
      when c.activation_status::text = 'activated' then 'activated'
      when c.business_id is null then 'ready_to_sell'
      else 'assigned'
    end,
    c.created_at,
    c.activated_at
  from public.cards c
  left join public.businesses b on b.id = c.business_id
  left join public.card_provisioning cp on cp.card_id = c.id
  order by c.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.v3_provider_list_cards(integer) from public;
grant execute on function public.v3_provider_list_cards(integer) to authenticated;

notify pgrst, 'reload schema';
