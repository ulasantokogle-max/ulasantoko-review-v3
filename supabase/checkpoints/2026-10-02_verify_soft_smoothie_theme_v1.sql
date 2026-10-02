-- Verify Soft Smoothie Theme V1
select
  (
    select count(*)
    from pg_constraint
    where conrelid='public.landing_page_settings'::regclass
      and conname='landing_page_settings_theme_key_check'
      and pg_get_constraintdef(oid) ilike '%soft_smoothie%'
  ) as smoothie_theme_allowed,
  (
    select count(*)
    from information_schema.routines
    where routine_schema='public'
      and routine_name='v3_update_landing_page_settings'
  ) as update_function_count;
