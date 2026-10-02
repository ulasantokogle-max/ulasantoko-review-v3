-- UlasanToko Review V3
-- Landing Page Cover Position V1

alter table public.landing_page_settings
add column if not exists cover_position text not null default 'center'
  check (cover_position in (
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'top-left',
    'top-right',
    'bottom-left',
    'bottom-right'
  ));

create or replace function public.v3_get_landing_page_settings(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.landing_page_settings%rowtype;
  v_business public.businesses%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_business
  from public.businesses
  where id = p_business_id
    and status::text = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'BUSINESS_NOT_FOUND',
      'message', 'Business not found'
    );
  end if;

  select * into v_row
  from public.landing_page_settings
  where business_id = p_business_id;

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'theme_key', coalesce(v_row.theme_key, 'warm_brown'),
    'hero_title', coalesce(v_row.hero_title, nullif(btrim(v_business.display_name), ''), v_business.name),
    'hero_description', coalesce(v_row.hero_description, 'Bagikan pengalaman Anda dan bantu bisnis ini berkembang.'),
    'about_text', v_row.about_text,
    'promo_text', v_row.promo_text,
    'logo_url', v_row.logo_url,
    'cover_url', v_row.cover_url,
    'cover_position', coalesce(v_row.cover_position, 'center'),
    'show_google_review', coalesce(v_row.show_google_review, true),
    'show_whatsapp', coalesce(v_row.show_whatsapp, true),
    'show_about', coalesce(v_row.show_about, true),
    'show_promo', coalesce(v_row.show_promo, true)
  );
end;
$$;

create or replace function public.v3_update_landing_page_settings(
  p_business_id uuid,
  p_theme_key text,
  p_hero_title text,
  p_hero_description text,
  p_about_text text,
  p_promo_text text,
  p_logo_url text,
  p_cover_url text,
  p_cover_position text,
  p_show_google_review boolean,
  p_show_whatsapp boolean,
  p_show_about boolean,
  p_show_promo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_theme text;
  v_logo text;
  v_cover text;
  v_position text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_theme := lower(btrim(coalesce(p_theme_key, 'warm_brown')));
  if v_theme not in ('warm_brown','soft_tosca','elegant_cream','minimal_dark') then
    return jsonb_build_object('success', false, 'code', 'INVALID_THEME', 'message', 'Theme tidak valid.');
  end if;

  v_position := lower(btrim(coalesce(p_cover_position, 'center')));
  if v_position not in (
    'center','top','bottom','left','right',
    'top-left','top-right','bottom-left','bottom-right'
  ) then
    return jsonb_build_object('success', false, 'code', 'INVALID_COVER_POSITION', 'message', 'Posisi cover tidak valid.');
  end if;

  v_logo := nullif(btrim(coalesce(p_logo_url, '')), '');
  v_cover := nullif(btrim(coalesce(p_cover_url, '')), '');

  if v_logo is not null and v_logo !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_LOGO_URL', 'message', 'Logo URL harus menggunakan HTTPS.');
  end if;

  if v_cover is not null and v_cover !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_COVER_URL', 'message', 'Cover URL harus menggunakan HTTPS.');
  end if;

  insert into public.landing_page_settings (
    business_id, theme_key, hero_title, hero_description, about_text, promo_text,
    logo_url, cover_url, cover_position,
    show_google_review, show_whatsapp, show_about, show_promo, updated_by
  )
  values (
    p_business_id, v_theme,
    nullif(btrim(coalesce(p_hero_title, '')), ''),
    nullif(btrim(coalesce(p_hero_description, '')), ''),
    nullif(btrim(coalesce(p_about_text, '')), ''),
    nullif(btrim(coalesce(p_promo_text, '')), ''),
    v_logo, v_cover, v_position,
    coalesce(p_show_google_review, true),
    coalesce(p_show_whatsapp, true),
    coalesce(p_show_about, true),
    coalesce(p_show_promo, true),
    auth.uid()
  )
  on conflict (business_id) do update
  set
    theme_key = excluded.theme_key,
    hero_title = excluded.hero_title,
    hero_description = excluded.hero_description,
    about_text = excluded.about_text,
    promo_text = excluded.promo_text,
    logo_url = excluded.logo_url,
    cover_url = excluded.cover_url,
    cover_position = excluded.cover_position,
    show_google_review = excluded.show_google_review,
    show_whatsapp = excluded.show_whatsapp,
    show_about = excluded.show_about,
    show_promo = excluded.show_promo,
    updated_by = auth.uid(),
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'theme_key', v_theme,
    'cover_position', v_position,
    'message', 'Landing page berhasil disimpan.'
  );
end;
$$;

create or replace function public.v3_get_public_landing_page(
  p_card_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card public.cards%rowtype;
  v_business public.businesses%rowtype;
  v_settings public.landing_page_settings%rowtype;
begin
  select * into v_card
  from public.cards
  where card_code = p_card_code
    and status::text = 'active'
    and activation_status::text = 'activated'
  limit 1;

  if v_card.id is null or v_card.business_id is null then
    return jsonb_build_object('success', false, 'code', 'CARD_NOT_FOUND', 'message', 'Card not found');
  end if;

  select * into v_business
  from public.businesses
  where id = v_card.business_id
    and status::text = 'active'
  limit 1;

  if v_business.id is null then
    return jsonb_build_object('success', false, 'code', 'BUSINESS_NOT_FOUND', 'message', 'Business not found');
  end if;

  select * into v_settings
  from public.landing_page_settings
  where business_id = v_business.id;

  return jsonb_build_object(
    'success', true,
    'business_id', v_business.id,
    'business_name', coalesce(nullif(btrim(v_business.display_name), ''), v_business.name),
    'category', v_business.category,
    'theme_key', coalesce(v_settings.theme_key, 'warm_brown'),
    'hero_title', coalesce(v_settings.hero_title, nullif(btrim(v_business.display_name), ''), v_business.name),
    'hero_description', coalesce(v_settings.hero_description, 'Bagikan pengalaman Anda dan bantu bisnis ini berkembang.'),
    'about_text', v_settings.about_text,
    'promo_text', v_settings.promo_text,
    'logo_url', v_settings.logo_url,
    'cover_url', v_settings.cover_url,
    'cover_position', coalesce(v_settings.cover_position, 'center'),
    'show_google_review', coalesce(v_settings.show_google_review, true),
    'show_whatsapp', coalesce(v_settings.show_whatsapp, true),
    'show_about', coalesce(v_settings.show_about, true),
    'show_promo', coalesce(v_settings.show_promo, true)
  );
end;
$$;

revoke all on function public.v3_update_landing_page_settings(uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean) from public;
grant execute on function public.v3_update_landing_page_settings(uuid,text,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean) to authenticated;

notify pgrst, 'reload schema';
