-- UlasanToko Review V3
-- Soft Smoothie Theme V1

do $$
declare
  v_constraint text;
begin
  select conname
  into v_constraint
  from pg_constraint
  where conrelid = 'public.landing_page_settings'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%theme_key%';

  if v_constraint is not null then
    execute format('alter table public.landing_page_settings drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.landing_page_settings
  add constraint landing_page_settings_theme_key_check
  check (theme_key in (
    'warm_brown',
    'soft_smoothie',
    'soft_tosca',
    'elegant_cream',
    'minimal_dark'
  ));

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
  p_instagram_url text,
  p_pdf_title text,
  p_pdf_url text,
  p_show_google_review boolean,
  p_show_whatsapp boolean,
  p_show_about boolean,
  p_show_promo boolean,
  p_show_instagram boolean,
  p_show_pdf boolean
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
  v_instagram text;
  v_pdf text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_theme := lower(btrim(coalesce(p_theme_key, 'warm_brown')));
  if v_theme not in ('warm_brown','soft_smoothie','soft_tosca','elegant_cream','minimal_dark') then
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
  v_instagram := nullif(btrim(coalesce(p_instagram_url, '')), '');
  v_pdf := nullif(btrim(coalesce(p_pdf_url, '')), '');

  if v_logo is not null and v_logo !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_LOGO_URL', 'message', 'Logo URL harus menggunakan HTTPS.');
  end if;

  if v_cover is not null and v_cover !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_COVER_URL', 'message', 'Cover URL harus menggunakan HTTPS.');
  end if;

  if v_instagram is not null and v_instagram !~* '^https://(www\.)?instagram\.com/[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_INSTAGRAM_URL', 'message', 'Gunakan URL Instagram yang valid.');
  end if;

  if v_pdf is not null and v_pdf !~* '^https://[^[:space:]]+$' then
    return jsonb_build_object('success', false, 'code', 'INVALID_PDF_URL', 'message', 'PDF URL harus menggunakan HTTPS.');
  end if;

  insert into public.landing_page_settings (
    business_id, theme_key, hero_title, hero_description, about_text, promo_text,
    logo_url, cover_url, cover_position, instagram_url, pdf_title, pdf_url,
    show_google_review, show_whatsapp, show_about, show_promo, show_instagram, show_pdf,
    updated_by
  )
  values (
    p_business_id, v_theme,
    nullif(btrim(coalesce(p_hero_title, '')), ''),
    nullif(btrim(coalesce(p_hero_description, '')), ''),
    nullif(btrim(coalesce(p_about_text, '')), ''),
    nullif(btrim(coalesce(p_promo_text, '')), ''),
    v_logo, v_cover, v_position, v_instagram,
    nullif(btrim(coalesce(p_pdf_title, '')), ''), v_pdf,
    coalesce(p_show_google_review, true),
    coalesce(p_show_whatsapp, true),
    coalesce(p_show_about, true),
    coalesce(p_show_promo, true),
    coalesce(p_show_instagram, true),
    coalesce(p_show_pdf, true),
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
    instagram_url = excluded.instagram_url,
    pdf_title = excluded.pdf_title,
    pdf_url = excluded.pdf_url,
    show_google_review = excluded.show_google_review,
    show_whatsapp = excluded.show_whatsapp,
    show_about = excluded.show_about,
    show_promo = excluded.show_promo,
    show_instagram = excluded.show_instagram,
    show_pdf = excluded.show_pdf,
    updated_by = auth.uid(),
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'business_id', p_business_id,
    'theme_key', v_theme,
    'message', 'Landing page berhasil disimpan.'
  );
end;
$$;

notify pgrst, 'reload schema';
