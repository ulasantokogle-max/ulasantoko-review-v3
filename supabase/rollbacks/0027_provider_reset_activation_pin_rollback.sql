-- Rollback provider activation PIN reset
drop function if exists public.v3_provider_reset_activation_pin(uuid);
notify pgrst, 'reload schema';
