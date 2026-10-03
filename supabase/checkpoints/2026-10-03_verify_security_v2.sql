-- Read-only checks after 0037. All sensitive tables must have RLS; no browser PIN grants.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('businesses','business_members','cards',
 'feedback_submissions','card_activation','provider_admins','feedback_rate_limits','card_activation_attempts');
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('card_activation','provider_admins')
 and grantee in ('anon','authenticated'); -- Expected: no rows.
select id,file_size_limit,allowed_mime_types from storage.buckets where id='landing-media';
select proname, pg_get_functiondef(p.oid) like '%for update%' as uses_lock,
 pg_get_functiondef(p.oid) like '%v_recent_count >= 30%' as card_wide_cap
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname='v3_submit_feedback';
select has_function_privilege('anon','public.v3_generate_activation_pin()','execute') as anon_pin_access,
 has_function_privilege('authenticated','public.v3_generate_activation_pin()','execute') as customer_pin_access;
-- Expected: both false. Run two-account application smoke checks after these reads.
