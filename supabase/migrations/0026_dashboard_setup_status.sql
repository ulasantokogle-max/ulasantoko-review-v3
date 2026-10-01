-- UlasanToko Review V3
-- Secure dashboard setup status helper

create or replace function public.v3_get_business_setup_status(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_whatsapp text;
  v_review_url text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(nullif(btrim(display_name), ''), name), whatsapp_number
  into v_display_name, v_whatsapp
  from public.businesses
  where id = p_business_id
    and status::text = 'active'
  limit 1;

  select review_url
  into v_review_url
  from public.google_review_profiles
  where business_id = p_business_id
    and status::text = 'active'
  limit 1;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'display_name', v_display_name,
    'whatsapp_number', v_whatsapp,
    'google_review_configured', coalesce(nullif(btrim(v_review_url), ''), '') <> ''
  );
end;
$$;

revoke all on function public.v3_get_business_setup_status(uuid) from public;
grant execute on function public.v3_get_business_setup_status(uuid) to authenticated;

notify pgrst, 'reload schema';
