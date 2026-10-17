-- V3 only. Apply after 0044 and after yukreview.id serves the tested V3 branch.
-- Public IDs, card ownership, PINs, printed QR contents, and NFC tags are unchanged.
begin;
do $$ begin
  if to_regprocedure('public.v3_get_feedback_capabilities()') is null
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cards' and column_name='public_id')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='cards' and column_name='deleted_at') then
    raise exception 'Apply V3 migrations through 0044 before 0045';
  end if;
end $$;
create schema if not exists backup_20261006_yukreview;
revoke all on schema backup_20261006_yukreview from public, anon, authenticated;
create table if not exists backup_20261006_yukreview.function_definitions(signature text primary key, definition text not null);
create table if not exists backup_20261006_yukreview.card_urls(card_id uuid primary key, qr_url text);
revoke all on all tables in schema backup_20261006_yukreview from public, anon, authenticated;
insert into backup_20261006_yukreview.function_definitions
values ('public.v3_provider_create_card(text,text,text)', pg_get_functiondef('public.v3_provider_create_card(text,text,text)'::regprocedure))
on conflict (signature) do nothing;
insert into backup_20261006_yukreview.card_urls select card_id,qr_url from public.card_provisioning
on conflict (card_id) do nothing;
-- Stored URLs are used for future copies/downloads/writes, never physical tags.
-- Only our known destinations are changed. Existing custom destinations remain.
update public.card_provisioning cp
set qr_url='https://yukreview.id/' || c.public_id
from public.cards c
where c.id=cp.card_id and c.deleted_at is null
  and (cp.qr_url like 'https://reputasipro.ulasantoko.space/%'
    or cp.qr_url like 'https://www.yukreview.id/%');

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

  v_pin := public.v3_generate_activation_pin();


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

  select 'https://yukreview.id/' || public_id into v_url
  from public.cards where id = v_card_id;

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



notify pgrst, 'reload schema';
commit;
