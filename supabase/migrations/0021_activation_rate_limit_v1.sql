-- UlasanToko Review V3
-- Security Hardening V1 / Stage 3A
-- Activation anti-bruteforce: attempt logging + per-user throttling + progressive card lockouts.

create table if not exists public.card_activation_attempts (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null,
  success boolean not null default false,
  reason text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_card_activation_attempts_card_time
  on public.card_activation_attempts(card_id, attempted_at desc);

create index if not exists idx_card_activation_attempts_user_time
  on public.card_activation_attempts(user_id, attempted_at desc);

alter table public.card_activation_attempts enable row level security;
revoke all privileges on table public.card_activation_attempts from anon, authenticated;

create or replace function public.v3_claim_card(
  p_card_code text,
  p_pin text,
  p_business_id uuid default null,
  p_business_name text default null,
  p_category text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid;
  v_email text;
  v_card public.cards%rowtype;
  v_activation public.card_activation%rowtype;
  v_org_id uuid;
  v_business_id uuid;
  v_business_name text;
  v_slug text;
  v_user_recent_failures integer;
  v_next_attempt_count integer;
  v_lock_interval interval;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Per-authenticated-user throttle across all activation cards.
  select count(*)
  into v_user_recent_failures
  from public.card_activation_attempts a
  where a.user_id = v_uid
    and a.success = false
    and a.attempted_at >= now() - interval '15 minutes';

  if v_user_recent_failures >= 10 then
    return jsonb_build_object(
      'success', false,
      'code', 'ACTIVATION_RATE_LIMITED',
      'message', 'Too many activation attempts. Please wait 15 minutes and try again.'
    );
  end if;

  v_email := coalesce(auth.jwt() ->> 'email', '');

  insert into public.users (id, email, status)
  values (v_uid, nullif(v_email, ''), 'active')
  on conflict (id) do update
  set email = coalesce(excluded.email, public.users.email);

  select *
  into v_card
  from public.cards
  where card_code = p_card_code
  for update;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found'
    );
  end if;

  if v_card.status::text <> 'active' then
    insert into public.card_activation_attempts(card_id, user_id, success, reason)
    values (v_card.id, v_uid, false, 'CARD_NOT_AVAILABLE');

    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_AVAILABLE',
      'message', 'Card is not available for activation'
    );
  end if;

  if v_card.activation_status::text = 'activated' then
    insert into public.card_activation_attempts(card_id, user_id, success, reason)
    values (v_card.id, v_uid, false, 'CARD_ALREADY_ACTIVATED');

    return jsonb_build_object(
      'success', false,
      'code', 'CARD_ALREADY_ACTIVATED',
      'message', 'Card has already been activated'
    );
  end if;

  select *
  into v_activation
  from public.card_activation
  where card_id = v_card.id
  for update;

  if v_activation.id is null then
    insert into public.card_activation_attempts(card_id, user_id, success, reason)
    values (v_card.id, v_uid, false, 'ACTIVATION_NOT_PROVISIONED');

    return jsonb_build_object(
      'success', false,
      'code', 'ACTIVATION_NOT_PROVISIONED',
      'message', 'Activation PIN has not been provisioned'
    );
  end if;

  if v_activation.locked_until is not null
     and v_activation.locked_until > now() then
    insert into public.card_activation_attempts(card_id, user_id, success, reason)
    values (v_card.id, v_uid, false, 'ACTIVATION_TEMPORARILY_LOCKED');

    return jsonb_build_object(
      'success', false,
      'code', 'ACTIVATION_TEMPORARILY_LOCKED',
      'message', 'Too many failed attempts. Please try again later.',
      'locked_until', v_activation.locked_until
    );
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_activation.pin_hash)
     <> v_activation.pin_hash then

    v_next_attempt_count := v_activation.attempt_count + 1;

    v_lock_interval := case
      when v_next_attempt_count >= 15 then interval '24 hours'
      when v_next_attempt_count >= 10 then interval '1 hour'
      when v_next_attempt_count >= 5 then interval '15 minutes'
      else null
    end;

    update public.card_activation
    set
      attempt_count = v_next_attempt_count,
      locked_until = case
        when v_lock_interval is not null then now() + v_lock_interval
        else null
      end
    where id = v_activation.id;

    insert into public.card_activation_attempts(card_id, user_id, success, reason)
    values (v_card.id, v_uid, false, 'INVALID_ACTIVATION_PIN');

    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_ACTIVATION_PIN',
      'message', 'Invalid activation PIN',
      'attempt_count', v_next_attempt_count,
      'locked_until', case
        when v_lock_interval is not null then now() + v_lock_interval
        else null
      end
    );
  end if;

  if p_business_id is not null then
    if not public.is_business_member(p_business_id) then
      raise exception 'FORBIDDEN';
    end if;

    v_business_id := p_business_id;
  else
    v_business_name := nullif(btrim(coalesce(p_business_name, '')), '');

    if v_business_name is null then
      return jsonb_build_object(
        'success', false,
        'code', 'BUSINESS_NAME_REQUIRED',
        'message', 'Business name is required'
      );
    end if;

    if length(v_business_name) > 160 then
      return jsonb_build_object(
        'success', false,
        'code', 'BUSINESS_NAME_TOO_LONG',
        'message', 'Business name is too long'
      );
    end if;

    insert into public.organizations (name, slug)
    values (
      v_business_name,
      'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
    )
    returning id into v_org_id;

    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      status
    )
    values (
      v_org_id,
      v_uid,
      'owner',
      'active'
    );

    v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);

    if v_slug = '' then
      v_slug := 'business';
    end if;

    v_slug := v_slug || '-' ||
      substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    insert into public.businesses (
      organization_id,
      name,
      slug,
      category,
      status
    )
    values (
      v_org_id,
      v_business_name,
      v_slug,
      nullif(left(btrim(coalesce(p_category, '')), 80), ''),
      'active'
    )
    returning id into v_business_id;

    insert into public.business_members (
      business_id,
      user_id,
      role,
      status
    )
    values (
      v_business_id,
      v_uid,
      'manager',
      'active'
    )
    on conflict (business_id, user_id) do nothing;
  end if;

  update public.cards
  set
    business_id = v_business_id,
    activation_status = 'activated',
    activated_at = now()
  where id = v_card.id;

  update public.card_activation
  set
    attempt_count = 0,
    locked_until = null,
    activated_by = v_uid,
    activated_at = now()
  where id = v_activation.id;

  insert into public.card_activation_attempts(card_id, user_id, success, reason)
  values (v_card.id, v_uid, true, 'ACTIVATED');

  insert into public.landing_pages (business_id, status)
  values (v_business_id, 'active')
  on conflict (business_id) do nothing;

  return jsonb_build_object(
    'success', true,
    'card_id', v_card.id,
    'card_code', v_card.card_code,
    'business_id', v_business_id,
    'message', 'Card activated successfully'
  );
end;
$$;

revoke all on function public.v3_claim_card(text, text, uuid, text, text) from public;
grant execute on function public.v3_claim_card(text, text, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
