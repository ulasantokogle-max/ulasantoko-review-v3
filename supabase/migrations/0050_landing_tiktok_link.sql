-- Additive TikTok links. Requires existing V3 landing settings and migrations 0048/0049.
-- Existing functions, links, data and annual term protections remain in place.
begin;
alter table public.landing_page_settings
  add column if not exists tiktok_url text,
  add column if not exists show_tiktok boolean not null default true;

create or replace function public.v3_get_landing_page_settings_with_tiktok(p_business_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_url text; v_show boolean;
begin
  v_result := public.v3_get_landing_page_settings(p_business_id);
  if coalesce((v_result->>'success')::boolean,false) is not true then return v_result; end if;
  select tiktok_url,show_tiktok into v_url,v_show from public.landing_page_settings where business_id=p_business_id;
  return v_result || jsonb_build_object('tiktok_url',v_url,'show_tiktok',coalesce(v_show,true),'tiktok_available',true);
end;
$$;
revoke all on function public.v3_get_landing_page_settings_with_tiktok(uuid) from public,anon;
grant execute on function public.v3_get_landing_page_settings_with_tiktok(uuid) to authenticated;

create or replace function public.v3_get_public_landing_page_with_tiktok(p_card_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_url text; v_show boolean;
begin
  -- Resolve only through the existing public function, including its deleted/activation guards.
  v_result := public.v3_get_public_landing_page(p_card_code);
  if coalesce((v_result->>'success')::boolean,false) is not true then return v_result; end if;
  select tiktok_url,show_tiktok into v_url,v_show from public.landing_page_settings
    where business_id=(v_result->>'business_id')::uuid;
  return v_result || jsonb_build_object('tiktok_url',v_url,'show_tiktok',coalesce(v_show,true));
end;
$$;
revoke all on function public.v3_get_public_landing_page_with_tiktok(text) from public;
grant execute on function public.v3_get_public_landing_page_with_tiktok(text) to anon,authenticated;

create or replace function public.v3_update_landing_page_settings_with_tiktok(
  p_business_id uuid,
  p_theme_key text,
  p_hero_title text,
  p_hero_description text,
  p_about_text text,
  p_promo_text text,
  p_logo_url text,
  p_cover_url text,
  p_cover_position text,
  p_instagram_url text,
  p_pdf_title text,
  p_pdf_url text,
  p_show_google_review boolean,
  p_show_whatsapp boolean,
  p_show_about boolean,
  p_show_promo boolean,
  p_show_instagram boolean,
  p_show_pdf boolean,
  p_tiktok_url text,
  p_show_tiktok boolean
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_result jsonb; v_url text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_business_member(p_business_id) then raise exception 'FORBIDDEN'; end if;
  perform public.v3_assert_business_term_writable(p_business_id);
  v_url := nullif(btrim(coalesce(p_tiktok_url,'')),'');
  if v_url is not null and (length(v_url)>2048 or v_url !~* '^https://((www[.])?tiktok[.]com|v[mt][.]tiktok[.]com)/[^[:space:][:cntrl:]]+$') then
    return jsonb_build_object('success',false,'code','INVALID_TIKTOK_URL','message','Gunakan link TikTok HTTPS yang valid.');
  end if;
  -- One transaction: reuse the existing validation/save, then append TikTok settings.
  v_result := public.v3_update_landing_page_settings(
    p_business_id => p_business_id,
    p_theme_key => p_theme_key,
    p_hero_title => p_hero_title,
    p_hero_description => p_hero_description,
    p_about_text => p_about_text,
    p_promo_text => p_promo_text,
    p_logo_url => p_logo_url,
    p_cover_url => p_cover_url,
    p_cover_position => p_cover_position,
    p_instagram_url => p_instagram_url,
    p_pdf_title => p_pdf_title,
    p_pdf_url => p_pdf_url,
    p_show_google_review => p_show_google_review,
    p_show_whatsapp => p_show_whatsapp,
    p_show_about => p_show_about,
    p_show_promo => p_show_promo,
    p_show_instagram => p_show_instagram,
    p_show_pdf => p_show_pdf
  );
  if coalesce((v_result->>'success')::boolean,false) is not true then return v_result; end if;
  update public.landing_page_settings set tiktok_url=v_url,show_tiktok=coalesce(p_show_tiktok,true),
    updated_by=auth.uid(),updated_at=now() where business_id=p_business_id;
  return v_result;
end;
$$;
revoke all on function public.v3_update_landing_page_settings_with_tiktok(uuid,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text,boolean) from public,anon;
grant execute on function public.v3_update_landing_page_settings_with_tiktok(uuid,text,text,text,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean,boolean,boolean,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
