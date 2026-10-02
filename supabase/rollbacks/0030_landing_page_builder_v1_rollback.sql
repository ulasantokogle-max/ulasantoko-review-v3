-- Rollback Landing Page Builder V1
drop function if exists public.v3_get_public_landing_page(text);
drop function if exists public.v3_update_landing_page_settings(uuid,text,text,text,text,text,text,text,boolean,boolean,boolean,boolean);
drop function if exists public.v3_get_landing_page_settings(uuid);
drop table if exists public.landing_page_settings;
notify pgrst, 'reload schema';
