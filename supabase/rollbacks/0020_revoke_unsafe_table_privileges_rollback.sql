-- Targeted rollback for Stage 2B.
-- Only use if an unexpected compatibility issue is proven.
-- These privileges are normally unnecessary for browser roles.

do $$
declare
  t text;
  sensitive_tables text[] := array[
    'users','organizations','organization_members','businesses','business_members',
    'cards','card_provisioning','card_activation','card_transfer_history',
    'landing_pages','landing_versions','landing_blocks','google_review_profiles',
    'interaction_events','feedback_submissions','feedback_notes','subscriptions',
    'audit_logs','provider_admins'
  ];
begin
  foreach t in array sensitive_tables
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'grant truncate, references, trigger on table public.%I to anon, authenticated',
        t
      );
    end if;
  end loop;
end
$$;

notify pgrst, 'reload schema';
