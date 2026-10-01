-- UlasanToko Review V3
-- DATABASE SAFETY CHECKPOINT
-- Run manually in Supabase SQL Editor BEFORE security hardening.
-- This is intentionally NOT a migration.
-- It creates an in-database snapshot of critical tables/functions so we have
-- a fast recovery point if a later policy/RPC change causes problems.

create schema if not exists backup_20261001;

create table if not exists backup_20261001._snapshot_meta (
  created_at timestamptz not null default now(),
  note text not null
);

insert into backup_20261001._snapshot_meta(note)
values ('Pre Security Hardening V1 checkpoint');

do $$
declare
  t text;
  tables_to_copy text[] := array[
    'users',
    'organizations',
    'organization_members',
    'businesses',
    'business_members',
    'cards',
    'card_activation',
    'card_provisioning',
    'landing_pages',
    'landing_versions',
    'landing_blocks',
    'google_review_profiles',
    'feedback_submissions',
    'interaction_events',
    'provider_admins'
  ];
begin
  foreach t in array tables_to_copy
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop table if exists backup_20261001.%I; create table backup_20261001.%I as table public.%I;',
        t, t, t
      );
    end if;
  end loop;
end
$$;

-- Minimal Auth snapshot. Password hashes are intentionally not copied.
drop table if exists backup_20261001.auth_users;
create table backup_20261001.auth_users as
select
  id,
  email,
  created_at,
  updated_at,
  email_confirmed_at,
  confirmation_sent_at,
  last_sign_in_at,
  raw_user_meta_data
from auth.users;

-- Snapshot V3 function definitions for quick restoration/reference.
drop table if exists backup_20261001.function_definitions;
create table backup_20261001.function_definitions as
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname like 'v3_%'
    or p.proname in (
      'is_business_member',
      'handle_new_auth_user',
      'set_updated_at'
    )
  );

-- Snapshot RLS state + policies before we add new ones.
drop table if exists backup_20261001.rls_state;
create table backup_20261001.rls_state as
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

drop table if exists backup_20261001.policies;
create table backup_20261001.policies as
select *
from pg_policies
where schemaname = 'public';

select
  'backup_20261001' as backup_schema,
  (select count(*) from backup_20261001.auth_users) as auth_user_count,
  (select count(*) from backup_20261001.function_definitions) as function_count,
  (select count(*) from backup_20261001.rls_state) as table_count;
