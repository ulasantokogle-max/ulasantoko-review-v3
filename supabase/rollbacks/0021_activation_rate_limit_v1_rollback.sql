-- Targeted rollback for Security Hardening V1 / Stage 3A.
-- Restores the pre-Stage-3A v3_claim_card behavior.
-- Attempt logs are retained for forensics; the table is not dropped.

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
begin
  v_uid := auth.uid();

  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
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
    return jsonb_build_object('success', false, 'code', 'CARD_NOT_FOUND', 'message', 'Card not found');
  end if;

  if v_card.status::text <> 'active' then
    return jsonb_build_object('success', false, 'code', 'CARD_NOT_AVAILABLE', 'message', 'Card is not available for activation');
  end if;

  if v_card.activation_status::text = 'activated' then
    return jsonb_build_object('success', false, 'code', 'CARD_ALREADY_ACTIVATED', 'message', 'Card has already been activated');
  end if;

  select * into v_activation
  from public.card_activation
  where card_id = v_card.id
  for update;

  if v_activation.id is null then
    return jsonb_build_object('success', false, 'code', 'ACTIVATION_NOT_PROVISIONED', 'message', 'Activation PIN has not been provisioned');
  end if;

  if v_activation.locked_until is not null and v_activation.locked_until > now() then
    return jsonb_build_object('success', false, 'code', 'ACTIVATION_TEMPORARILY_LOCKED', 'message', 'Too many failed attempts. Please try again later.');
  end if;

  if extensions.crypt(coalesce(p_pin, ''), v_activation.pin_hash) <> v_activation.pin_hash then
    update public.card_activation
    set
      attempt_count = attempt_count + 1,
      locked_until = case
        when attempt_count + 1 >= 5 then now() + interval '15 minutes'
        else locked_until
      end
    where id = v_activation.id;

    return jsonb_build_object('success', false, 'code', 'INVALID_ACTIVATION_PIN', 'message', 'Invalid activation PIN');
  end if;

  if p_business_id is not null then
    if not public.is_business_member(p_business_id) then
      raise exception 'FORBIDDEN';
    end if;
    v_business_id := p_business_id;
  else
    v_business_name := nullif(btrim(coalesce(p_business_name, '')), '');
    if v_business_name is null then
      return jsonb_build_object('success', false, 'code', 'BUSINESS_NAME_REQUIRED', 'message', 'Business name is required');
    end if;

    insert into public.organizations (name, slug)
    values (v_business_name, 'org-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_org_id, v_uid, 'owner', 'active');

    v_slug := lower(regexp_replace(v_business_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_slug := trim(both '-' from v_slug);
    if v_slug = '' then v_slug := 'business'; end if;
    v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

    insert into public.businesses (organization_id, name, slug, category, status)
    values (v_org_id, v_business_name, v_slug, nullif(btrim(coalesce(p_category, '')), ''), 'active')
    returning id into v_business_id;

    insert into public.business_members (business_id, user_id, role, status)
    values (v_business_id, v_uid, 'manager', 'active')
    on conflict (business_id, user_id) do nothing;
  end if;

  update public.cards
  set business_id = v_business_id, activation_status = 'activated', activated_at = now()
  where id = v_card.id;

  update public.card_activation
  set attempt_count = 0, locked_until = null, activated_by = v_uid, activated_at = now()
  where id = v_activation.id;

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
