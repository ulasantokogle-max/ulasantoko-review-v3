-- UlasanToko Review V3
-- Remove failing auth.users sync trigger.
-- New customer rows in public.users are created safely by v3_claim_card()
-- after the customer has authenticated and begins card activation.

drop trigger if exists on_auth_user_created on auth.users;

-- Keep the function available for reference, but it is no longer attached
-- to auth.users so it cannot block Supabase Auth signup.
notify pgrst, 'reload schema';
