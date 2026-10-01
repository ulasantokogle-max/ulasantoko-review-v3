-- UlasanToko Review V3
-- Security Hardening V1 / Stage 2
-- Enforce RLS isolation for customer/provider data without changing existing RPC contracts.

-- 1) Make sure RLS is enabled on every sensitive table used by V3.
alter table if exists public.users enable row level security;
alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.businesses enable row level security;
alter table if exists public.business_members enable row level security;
alter table if exists public.cards enable row level security;
alter table if exists public.card_provisioning enable row level security;
alter table if exists public.card_activation enable row level security;
alter table if exists public.card_transfer_history enable row level security;
alter table if exists public.landing_pages enable row level security;
alter table if exists public.landing_versions enable row level security;
alter table if exists public.landing_blocks enable row level security;
alter table if exists public.google_review_profiles enable row level security;
alter table if exists public.interaction_events enable row level security;
alter table if exists public.feedback_submissions enable row level security;
alter table if exists public.feedback_notes enable row level security;
alter table if exists public.subscriptions enable row level security;
alter table if exists public.audit_logs enable row level security;
alter table if exists public.provider_admins enable row level security;

-- 2) Self-only user profile read.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'users_self_select'
  ) then
    create policy users_self_select
    on public.users
    for select
    to authenticated
    using (id = auth.uid());
  end if;
end
$$;

-- 3) Provider admin rows are visible only to the same provider user.
do $$
begin
  if to_regclass('public.provider_admins') is not null
     and not exists (
       select 1
       from pg_policies
       where schemaname = 'public'
         and tablename = 'provider_admins'
         and policyname = 'provider_admins_self_select'
     ) then
    create policy provider_admins_self_select
    on public.provider_admins
    for select
    to authenticated
    using (user_id = auth.uid());
  end if;
end
$$;

-- 4) Card provisioning can be read only by the owning business or provider admin.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'card_provisioning'
      and policyname = 'card_provisioning_scoped_select'
  ) then
    create policy card_provisioning_scoped_select
    on public.card_provisioning
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.cards c
        where c.id = card_provisioning.card_id
          and (
            public.is_business_member(c.business_id)
            or public.v3_is_provider_admin()
          )
      )
    );
  end if;
end
$$;

-- 5) Landing drafts/versions are private to the business dashboard.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'landing_versions'
      and policyname = 'landing_versions_scoped_select'
  ) then
    create policy landing_versions_scoped_select
    on public.landing_versions
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.landing_pages lp
        where lp.id = landing_versions.landing_page_id
          and public.is_business_member(lp.business_id)
      )
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'landing_blocks'
      and policyname = 'landing_blocks_scoped_select'
  ) then
    create policy landing_blocks_scoped_select
    on public.landing_blocks
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.landing_versions lv
        join public.landing_pages lp on lp.id = lv.landing_page_id
        where lv.id = landing_blocks.landing_version_id
          and public.is_business_member(lp.business_id)
      )
    );
  end if;
end
$$;

-- 6) Card transfer history is visible only to a member of either related business.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'card_transfer_history'
      and policyname = 'card_transfer_history_scoped_select'
  ) then
    create policy card_transfer_history_scoped_select
    on public.card_transfer_history
    for select
    to authenticated
    using (
      (from_business_id is not null and public.is_business_member(from_business_id))
      or
      (to_business_id is not null and public.is_business_member(to_business_id))
    );
  end if;
end
$$;

-- 7) Ultra-sensitive tables must never be directly readable by browser roles.
-- SECURITY DEFINER RPCs remain the only intended access path.
revoke select, insert, update, delete on table public.card_activation from anon, authenticated;
revoke insert, update, delete on table public.provider_admins from anon, authenticated;

-- Do not force RLS: current SECURITY DEFINER RPCs intentionally operate as the function owner.
notify pgrst, 'reload schema';
