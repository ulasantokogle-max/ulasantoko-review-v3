-- Rollback Analytics Dashboard V1
drop function if exists public.v3_get_business_analytics(uuid);
notify pgrst, 'reload schema';
