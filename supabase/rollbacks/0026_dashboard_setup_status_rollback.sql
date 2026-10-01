-- Rollback dashboard setup status helper
drop function if exists public.v3_get_business_setup_status(uuid);
notify pgrst, 'reload schema';
