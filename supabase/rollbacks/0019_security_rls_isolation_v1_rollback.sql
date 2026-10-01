-- UlasanToko Review V3
-- Targeted rollback for Security Hardening V1 / Stage 2.
-- This only removes policies/grant changes introduced by 0019.
-- It intentionally DOES NOT disable RLS because V3 foundation already requires RLS.

drop policy if exists users_self_select on public.users;
drop policy if exists provider_admins_self_select on public.provider_admins;
drop policy if exists card_provisioning_scoped_select on public.card_provisioning;
drop policy if exists landing_versions_scoped_select on public.landing_versions;
drop policy if exists landing_blocks_scoped_select on public.landing_blocks;
drop policy if exists card_transfer_history_scoped_select on public.card_transfer_history;

-- Restore only the browser grants changed by 0019 if emergency rollback is required.
grant select, insert, update, delete on table public.card_activation to authenticated;
grant insert, update, delete on table public.provider_admins to authenticated;

notify pgrst, 'reload schema';
