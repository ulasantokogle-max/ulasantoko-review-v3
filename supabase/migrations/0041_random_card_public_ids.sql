-- V3 only: apply after 0038 and 0039. Old card codes remain valid.
begin;
do $$
begin
  if to_regprocedure('public.v3_is_provider_member()') is null then
    raise exception 'Apply provider MFA migration 0039 before 0041';
  end if;
end;
$$;
alter table public.cards add column if not exists public_id text;
alter table public.cards alter column public_id set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
update public.cards set public_id = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) where public_id is null;
alter table public.cards alter column public_id set not null;
create unique index if not exists cards_public_id_unique on public.cards(public_id);

create or replace function public.v3_keep_card_public_id()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.public_id is distinct from old.public_id then
    raise exception 'CARD_PUBLIC_ID_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.v3_keep_card_public_id() from public, anon, authenticated;
drop trigger if exists trg_card_public_id_immutable on public.cards;
create trigger trg_card_public_id_immutable before update of public_id on public.cards
for each row execute function public.v3_keep_card_public_id();

create or replace function public.v3_resolve_card_code(p_public_id text)
returns text language sql stable security definer set search_path = public
as $$
  select card_code from public.cards
  where public_id = lower(btrim(p_public_id)) and status::text = 'active';
$$;
revoke all on function public.v3_resolve_card_code(text) from public;
grant execute on function public.v3_resolve_card_code(text) to anon, authenticated;

-- New downloads/writes use the short URL; printed/written old URLs still resolve.
update public.card_provisioning cp
set qr_url = 'https://reputasipro.ulasantoko.space/' || c.public_id
from public.cards c where c.id = cp.card_id;

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

  select 'https://reputasipro.ulasantoko.space/' || public_id into v_url
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
