-- Rollback Customer Reset Setup V1
drop function if exists public.v3_customer_reset_card_setup(uuid);
notify pgrst, 'reload schema';
