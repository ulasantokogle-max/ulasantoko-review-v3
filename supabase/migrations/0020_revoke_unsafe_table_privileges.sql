-- UlasanToko Review V3
-- Security Hardening V1 / Stage 2B
-- Remove non-DML table privileges that browser roles should never have.
-- Important: TRUNCATE bypasses RLS and must not be granted to anon/authenticated.

do $$
declare
  t text;
  sensitive_tables text[] := array[
    'users',
    'organizations',
    'organization_members',
    'businesses',
    'business_members',
    'cards',
    'card_provisioning',
    'card_activation',
    'card_transfer_history',
    'landing_pages',
    'landing_versions',
    'landing_blocks',
    'google_review_profiles',
    'interaction_events',
    'feedback_submissions',
    'feedback_notes',
    'subscriptions',
    'audit_logs',
    'provider_admins'
  ];
begin
  foreach t in array sensitive_tables
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'revoke truncate, references, trigger on table public.%I from anon, authenticated',
        t
      );
    end if;
  end loop;
end
$$;

-- Ultra-sensitive tables: browser roles get no direct table privileges at all.
revoke all privileges on table public.card_activation from anon, authenticated;
revoke all privileges on table public.provider_admins from anon, authenticated;

notify pgrst, 'reload schema';
