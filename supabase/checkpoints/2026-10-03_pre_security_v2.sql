-- Run in the V3 project's SQL Editor before migration 0037. No customer data copied.
begin;
create schema if not exists backup_20261003;
revoke all on schema backup_20261003 from public, anon, authenticated;
create table if not exists backup_20261003.function_definitions as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in (
 'v3_submit_feedback','v3_check_google_maps_resolver_rate_limit','v3_claim_card',
 'v3_provider_create_card','v3_provider_reset_activation_pin'
);
create table if not exists backup_20261003.bucket_settings as
select id,file_size_limit,allowed_mime_types from storage.buckets where id='landing-media';
revoke all on all tables in schema backup_20261003 from public,anon,authenticated;
commit;
