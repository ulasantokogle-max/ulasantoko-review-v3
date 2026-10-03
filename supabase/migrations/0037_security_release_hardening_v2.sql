begin;
do $$ begin
 if to_regclass('backup_20261003.function_definitions') is null
    or to_regclass('backup_20261003.bucket_settings') is null then
   raise exception 'Run 2026-10-03_pre_security_v2.sql before migration 0037';
 end if;
 if not exists (select 1 from storage.buckets where id='landing-media') then
   raise exception 'Missing landing-media bucket; verify earlier V3 migrations';
 end if;
end $$;
-- V3 only. Apply after checkpoint and verify with 2026-10-03_verify_security_v2.sql.
-- Preserve existing data and RPC signature. Card-wide cap: 30 accepted submissions/10 minutes.
create index if not exists idx_feedback_rate_limits_card_time
  on public.feedback_rate_limits(card_id, created_at desc);

create or replace function public.v3_submit_feedback(
  p_card_code text,
  p_rating smallint,
  p_customer_name text default null,
  p_customer_phone text default null,
  p_message text default null,
  p_category text default null,
  p_contact_consent boolean default false,
  p_session_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_business public.businesses%rowtype;
  v_feedback_id uuid;
  v_session_key text;
  v_recent_count integer;
  v_name text;
  v_phone text;
  v_message text;
  v_category text;
begin
  if p_rating is null or p_rating < 1 or p_rating > 3 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_RATING',
      'message', 'Rating must be between 1 and 3'
    );
  end if;

  v_name := nullif(btrim(coalesce(p_customer_name, '')), '');
  v_phone := nullif(btrim(coalesce(p_customer_phone, '')), '');
  v_message := nullif(btrim(coalesce(p_message, '')), '');
  v_category := nullif(btrim(coalesce(p_category, '')), '');

  if v_name is not null and length(v_name) > 120 then
    return jsonb_build_object('success', false, 'code', 'NAME_TOO_LONG', 'message', 'Customer name is too long');
  end if;

  if v_phone is not null and length(v_phone) > 32 then
    return jsonb_build_object('success', false, 'code', 'PHONE_TOO_LONG', 'message', 'Phone number is too long');
  end if;

  if v_message is not null and length(v_message) > 2000 then
    return jsonb_build_object('success', false, 'code', 'MESSAGE_TOO_LONG', 'message', 'Feedback message is too long');
  end if;

  if v_category is not null and length(v_category) > 80 then
    return jsonb_build_object('success', false, 'code', 'CATEGORY_TOO_LONG', 'message', 'Feedback category is too long');
  end if;

  select *
  into v_card
  from public.cards
  where card_code = p_card_code
    and status::text = 'active'
  limit 1
  for update;

  if v_card.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'CARD_NOT_FOUND',
      'message', 'Card not found or inactive'
    );
  end if;

  select *
  into v_business
  from public.businesses
  where id = v_card.business_id
    and status::text = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'BUSINESS_NOT_FOUND',
      'message', 'Business not found or inactive'
    );
  end if;

  -- The card row lock serializes concurrent submissions, including direct RPC calls.
  -- Card-wide throttling cannot be bypassed by rotating browser session IDs.
  select count(*) into v_recent_count
  from public.feedback_rate_limits r
  where r.card_id = v_card.id
    and r.created_at >= now() - interval '10 minutes';
  if v_recent_count >= 30 then
    return jsonb_build_object('success', false, 'code', 'FEEDBACK_RATE_LIMITED',
      'message', 'Too many feedback submissions. Please try again later.');
  end if;

  -- Session-based public throttling. Public clients must send a stable random session_id.
  -- If missing, fall back to a conservative anonymous bucket per card.
  v_session_key := coalesce(nullif(btrim(coalesce(p_session_id, '')), ''), 'anonymous');

  if length(v_session_key) > 160 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_SESSION',
      'message', 'Invalid session identifier'
    );
  end if;

  select count(*)
  into v_recent_count
  from public.feedback_rate_limits r
  where r.card_id = v_card.id
    and r.session_key = v_session_key
    and r.created_at >= now() - interval '10 minutes';

  if v_recent_count >= 3 then
    return jsonb_build_object(
      'success', false,
      'code', 'FEEDBACK_RATE_LIMITED',
      'message', 'Too many feedback submissions. Please wait a few minutes and try again.'
    );
  end if;

  -- Reject exact duplicates from the same card/session during the last minute.
  if exists (
    select 1
    from public.feedback_submissions f
    where f.card_id = v_card.id
      and f.created_at >= now() - interval '1 minute'
      and coalesce(f.message, '') = coalesce(v_message, '')
      and f.rating = p_rating
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'DUPLICATE_FEEDBACK',
      'message', 'This feedback was already submitted.'
    );
  end if;

  insert into public.feedback_rate_limits(card_id, session_key)
  values (v_card.id, v_session_key);

  insert into public.feedback_submissions (
    organization_id,
    business_id,
    card_id,
    rating,
    customer_name,
    customer_phone,
    message,
    category,
    contact_consent,
    status
  )
  values (
    v_business.organization_id,
    v_business.id,
    v_card.id,
    p_rating,
    v_name,
    v_phone,
    v_message,
    v_category,
    coalesce(p_contact_consent, false),
    'new'
  )
  returning id into v_feedback_id;

  insert into public.interaction_events (
    organization_id,
    business_id,
    card_id,
    session_id,
    event_type,
    source,
    metadata
  )
  values (
    v_business.organization_id,
    v_business.id,
    v_card.id,
    nullif(v_session_key, 'anonymous'),
    'feedback_submit',
    'public_card',
    jsonb_build_object(
      'rating', p_rating,
      'feedback_id', v_feedback_id
    )
  );

  return jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'message', 'Feedback saved'
  );
end;
$$;

revoke all on function public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean, text
) from public;

grant execute on function public.v3_submit_feedback(
  text, smallint, text, text, text, text, boolean, text
) to anon, authenticated;

notify pgrst, 'reload schema';

-- Serialize lookup checks across simultaneous requests by the same account.
create or replace function public.v3_check_google_maps_resolver_rate_limit()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_count integer;
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  select count(*)
  into v_count
  from public.google_maps_resolver_attempts a
  where a.user_id = v_uid
    and a.created_at >= now() - interval '10 minutes';

  if v_count >= 10 then
    return jsonb_build_object(
      'success', false,
      'code', 'GOOGLE_MAPS_RATE_LIMITED',
      'message', 'Too many Google Maps lookups. Please wait a few minutes and try again.'
    );
  end if;

  insert into public.google_maps_resolver_attempts(user_id)
  values (v_uid);

  return jsonb_build_object(
    'success', true,
    'remaining', greatest(0, 9 - v_count)
  );
end;
$$;

revoke all on function public.v3_check_google_maps_resolver_rate_limit() from public;
grant execute on function public.v3_check_google_maps_resolver_rate_limit() to authenticated;

notify pgrst, 'reload schema';

-- Storage enforces these limits even when a client bypasses the upload form.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
where id = 'landing-media';
notify pgrst, 'reload schema';

-- Cryptographically random six-digit PINs, without modulo bias.
create or replace function public.v3_generate_activation_pin()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare raw bytea; value integer;
begin
  loop
    raw := extensions.gen_random_bytes(3);
    value := get_byte(raw,0)*65536 + get_byte(raw,1)*256 + get_byte(raw,2);
    exit when value < 16000000;
  end loop;
  return lpad((value % 1000000)::text,6,'0');
end;
$$;
revoke all on function public.v3_generate_activation_pin() from public,anon,authenticated;
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

  v_pin := public.v3_generate_activation_pin();

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

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 1));

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

commit;
