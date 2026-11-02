-- Provider-only card resale reset. Does not alter card QR/NFC identity or customer business records.
create or replace function public.v3_provider_reset_card_for_resale(p_card_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'extensions'
as $function$
declare
  v_card public.cards%rowtype;
  v_pin text;
  v_business_name text;
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_card
    from public.cards
    where id = p_card_id and deleted_at is null
    for update;

  if v_card.id is null then
    return jsonb_build_object('success',false,'message','Kartu tidak ditemukan');
  end if;
  if v_card.status::text <> 'active'
     or v_card.activation_status::text <> 'activated'
     or v_card.business_id is null then
    return jsonb_build_object('success',false,'message','Hanya kartu aktif milik bisnis yang bisa direset');
  end if;
  if not exists (select 1 from public.card_activation where card_id = v_card.id) then
    return jsonb_build_object('success',false,'message','Data aktivasi kartu tidak ditemukan');
  end if;

  select coalesce(nullif(display_name,''),name), organization_id
    into v_business_name, v_org_id
    from public.businesses where id = v_card.business_id;
  v_pin := public.v3_generate_activation_pin();

  update public.card_activation
    set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
        attempt_count = 0, locked_until = null,
        activated_by = null, activated_at = null
    where card_id = v_card.id;

  update public.cards
    set business_id = null, activation_status = 'unassigned',
        activated_at = null
    where id = v_card.id;

  insert into public.card_transfer_history
    (card_id,from_business_id,to_business_id,initiated_by,confirmed_by,reason)
  values (v_card.id,v_card.business_id,null,auth.uid(),auth.uid(),'provider_reset_ready_to_sell');

  insert into public.audit_logs
    (organization_id,business_id,user_id,action,entity_type,entity_id,metadata)
  values (v_org_id,v_card.business_id,auth.uid(),'provider_card_reset_for_resale','card',v_card.id,
    jsonb_build_object('card_code',v_card.card_code,'previous_business',v_business_name,'new_status','ready_to_sell'));

  return jsonb_build_object('success',true,'card_id',v_card.id,
    'card_code',v_card.card_code,'activation_pin',v_pin,
    'inventory_status','ready_to_sell','message','Kartu siap dijual kembali');
end;
$function$;

revoke all on function public.v3_provider_reset_card_for_resale(uuid) from public, anon;
grant execute on function public.v3_provider_reset_card_for_resale(uuid) to authenticated;
