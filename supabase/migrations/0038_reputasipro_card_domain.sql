-- V3 only. Apply after reputasipro.ulasantoko.space serves the tested V3 release.
-- Existing printed QR/NFC destinations and stored card URLs are unchanged.
begin;

-- Preserve the currently deployed provider function for a targeted rollback.
create schema if not exists backup_20261003_domain;
revoke all on schema backup_20261003_domain from public, anon, authenticated;
create table if not exists backup_20261003_domain.function_definitions (
  signature text primary key,
  definition text not null
);
revoke all on backup_20261003_domain.function_definitions from public, anon, authenticated;

do $$
begin
  if to_regprocedure('public.v3_generate_activation_pin()') is null then
    raise exception 'Apply security migration 0037 before domain migration 0038';
  end if;
end;
$$;

insert into backup_20261003_domain.function_definitions(signature, definition)
values ('public.v3_provider_create_card(text,text,text)',
  pg_get_functiondef('public.v3_provider_create_card(text,text,text)'::regprocedure))
on conflict (signature) do nothing;

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
  v_url := 'https://reputasipro.ulasantoko.space/' || v_card_code;

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


notify pgrst, 'reload schema';
commit;
