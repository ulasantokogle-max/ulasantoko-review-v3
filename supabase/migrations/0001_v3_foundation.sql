-- UlasanToko Review V3
-- Standalone foundation migration.
-- Does NOT reference V1 or WiV1 tables.

create extension if not exists pgcrypto;

create type public.org_status as enum ('active','suspended','archived');
create type public.user_status as enum ('active','suspended','invited');
create type public.member_status as enum ('active','suspended','invited');
create type public.org_role as enum ('owner','admin','viewer');
create type public.business_role as enum ('manager','staff','viewer');
create type public.card_operational_status as enum ('active','suspended','retired');
create type public.card_activation_status as enum ('unassigned','assigned','activated');
create type public.landing_status as enum ('active','archived');
create type public.landing_version_status as enum ('draft','published','archived');
create type public.feedback_status as enum ('new','viewed','contacted','resolved','closed');
create type public.subscription_status as enum ('trial','active','past_due','grace','suspended','cancelled');
create type public.plan_status as enum ('active','archived');
create type public.event_type as enum (
  'card_view',
  'rating_start',
  'rating_submit',
  'review_click',
  'whatsapp_click',
  'menu_click',
  'website_click',
  'phone_click',
  'custom_button_click',
  'feedback_submit'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status public.org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key,
  email text,
  phone text,
  full_name text,
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.org_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  category text,
  description text,
  timezone text not null default 'Asia/Jakarta',
  status public.org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.business_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  card_code text not null unique,
  label text,
  area text,
  internal_code text,
  status public.card_operational_status not null default 'active',
  activation_status public.card_activation_status not null default 'unassigned',
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.card_provisioning (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references public.cards(id) on delete cascade,
  qr_enabled boolean not null default true,
  qr_url text not null,
  qr_foreground_color text not null default '#000000',
  qr_background_color text not null default '#FFFFFF',
  qr_error_correction text not null default 'M',
  nfc_enabled boolean not null default true,
  nfc_identifier text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (qr_foreground_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (qr_background_color ~ '^#[0-9A-Fa-f]{6}$'),
  check (qr_error_correction in ('L','M','Q','H'))
);

create table public.card_activation (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null unique references public.cards(id) on delete cascade,
  pin_hash text not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  locked_until timestamptz,
  activated_by uuid references public.users(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.card_transfer_history (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete restrict,
  from_business_id uuid references public.businesses(id) on delete set null,
  to_business_id uuid references public.businesses(id) on delete set null,
  initiated_by uuid references public.users(id) on delete set null,
  confirmed_by uuid references public.users(id) on delete set null,
  reason text,
  transferred_at timestamptz not null default now()
);

create table public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  status public.landing_status not null default 'active',
  current_published_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.landing_versions (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid not null references public.landing_pages(id) on delete cascade,
  version_number integer not null,
  status public.landing_version_status not null default 'draft',
  created_by uuid references public.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (landing_page_id, version_number)
);

create table public.landing_blocks (
  id uuid primary key default gen_random_uuid(),
  landing_version_id uuid not null references public.landing_versions(id) on delete cascade,
  block_type text not null,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.google_review_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses(id) on delete cascade,
  maps_url text,
  place_id text,
  review_url text,
  business_name text,
  status public.org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.interaction_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  session_id text,
  event_type public.event_type not null,
  source text,
  occurred_at timestamptz not null default now(),
  timezone text not null default 'Asia/Jakarta',
  metadata jsonb not null default '{}'::jsonb
);

create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  rating smallint not null check (rating between 1 and 3),
  customer_name text,
  customer_phone text,
  message text,
  category text,
  contact_consent boolean not null default false,
  status public.feedback_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.feedback_submissions(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status public.plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_entitlements (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  limit_value bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, feature_key)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status public.subscription_status not null default 'trial',
  started_at timestamptz not null default now(),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_businesses_org on public.businesses(organization_id);
create index idx_org_members_user on public.organization_members(user_id);
create index idx_business_members_user on public.business_members(user_id);
create index idx_cards_business on public.cards(business_id);
create index idx_cards_status on public.cards(status, activation_status);
create index idx_events_org_time on public.interaction_events(organization_id, occurred_at desc);
create index idx_events_business_time on public.interaction_events(business_id, occurred_at desc);
create index idx_events_card_time on public.interaction_events(card_id, occurred_at desc);
create index idx_events_type_time on public.interaction_events(event_type, occurred_at desc);
create index idx_feedback_business_time on public.feedback_submissions(business_id, created_at desc);
create index idx_feedback_card_time on public.feedback_submissions(card_id, created_at desc);
create index idx_audit_org_time on public.audit_logs(organization_id, created_at desc);

-- Updated-at triggers
create trigger trg_org_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_user_updated before update on public.users for each row execute function public.set_updated_at();
create trigger trg_org_member_updated before update on public.organization_members for each row execute function public.set_updated_at();
create trigger trg_business_updated before update on public.businesses for each row execute function public.set_updated_at();
create trigger trg_business_member_updated before update on public.business_members for each row execute function public.set_updated_at();
create trigger trg_card_updated before update on public.cards for each row execute function public.set_updated_at();
create trigger trg_provisioning_updated before update on public.card_provisioning for each row execute function public.set_updated_at();
create trigger trg_activation_updated before update on public.card_activation for each row execute function public.set_updated_at();
create trigger trg_landing_updated before update on public.landing_pages for each row execute function public.set_updated_at();
create trigger trg_landing_version_updated before update on public.landing_versions for each row execute function public.set_updated_at();
create trigger trg_block_updated before update on public.landing_blocks for each row execute function public.set_updated_at();
create trigger trg_review_updated before update on public.google_review_profiles for each row execute function public.set_updated_at();
create trigger trg_feedback_updated before update on public.feedback_submissions for each row execute function public.set_updated_at();
create trigger trg_plan_updated before update on public.plans for each row execute function public.set_updated_at();
create trigger trg_entitlement_updated before update on public.plan_entitlements for each row execute function public.set_updated_at();
create trigger trg_subscription_updated before update on public.subscriptions for each row execute function public.set_updated_at();

-- RLS foundation
alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.cards enable row level security;
alter table public.card_provisioning enable row level security;
alter table public.card_activation enable row level security;
alter table public.card_transfer_history enable row level security;
alter table public.landing_pages enable row level security;
alter table public.landing_versions enable row level security;
alter table public.landing_blocks enable row level security;
alter table public.google_review_profiles enable row level security;
alter table public.interaction_events enable row level security;
alter table public.feedback_submissions enable row level security;
alter table public.feedback_notes enable row level security;
alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;

-- Helper functions for scoped access.
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_business_member(target_business uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members bm
    where bm.business_id = target_business
      and bm.user_id = auth.uid()
      and bm.status = 'active'
  )
  or exists (
    select 1
    from public.businesses b
    join public.organization_members om on om.organization_id = b.organization_id
    where b.id = target_business
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

-- Authenticated read policies. Writes will be tightened in API/RPC layer.
create policy organizations_select on public.organizations
for select to authenticated
using (public.is_org_member(id));

create policy organization_members_select on public.organization_members
for select to authenticated
using (public.is_org_member(organization_id));

create policy businesses_select on public.businesses
for select to authenticated
using (public.is_business_member(id));

create policy business_members_select on public.business_members
for select to authenticated
using (public.is_business_member(business_id));

create policy cards_select on public.cards
for select to authenticated
using (public.is_business_member(business_id));

create policy landing_pages_select on public.landing_pages
for select to authenticated
using (public.is_business_member(business_id));

create policy google_review_select on public.google_review_profiles
for select to authenticated
using (public.is_business_member(business_id));

create policy feedback_select on public.feedback_submissions
for select to authenticated
using (public.is_business_member(business_id));

create policy feedback_notes_select on public.feedback_notes
for select to authenticated
using (
  exists (
    select 1
    from public.feedback_submissions f
    where f.id = feedback_notes.feedback_id
      and public.is_business_member(f.business_id)
  )
);

create policy events_select on public.interaction_events
for select to authenticated
using (public.is_business_member(business_id));

create policy audit_select on public.audit_logs
for select to authenticated
using (
  organization_id is not null
  and public.is_org_member(organization_id)
);

create policy subscriptions_select on public.subscriptions
for select to authenticated
using (public.is_org_member(organization_id));

-- Public-facing content is deliberately not opened via broad table SELECT.
-- Public card routing will use a tightly scoped RPC/API service layer.
-- Service-role operations are performed server-side only.

-- Seed plans
insert into public.plans (name, slug, description)
values
  ('Single', 'single', 'Entry package for a small number of cards.'),
  ('Starter', 'starter', 'Starter package for growing businesses.'),
  ('Business', 'business', 'Multi-card business package.'),
  ('Enterprise', 'enterprise', 'Custom enterprise package.')
on conflict (slug) do nothing;
