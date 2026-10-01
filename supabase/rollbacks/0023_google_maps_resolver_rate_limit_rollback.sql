-- Targeted rollback for Security Hardening V1 / Stage 3C.
drop function if exists public.v3_check_google_maps_resolver_rate_limit();
-- Keep attempt logs/table for forensic history.
notify pgrst, 'reload schema';
