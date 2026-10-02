-- Rollback Provider Factory Reset / Transfer Ownership V1
drop function if exists public.v3_provider_factory_reset_card(uuid, text);
notify pgrst, 'reload schema';
