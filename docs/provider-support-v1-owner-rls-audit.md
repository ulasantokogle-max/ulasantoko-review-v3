# STEP 2.32 — Owner and RLS compatibility findings (read-only)

Status: reviewed against current YukReview V3 Supabase metadata; no SQL executed other than read-only catalog inspection. No migration or production change.

## Verified ownership path

- `public.businesses.organization_id` joins `public.organization_members.organization_id`.
- `organization_members.role` includes `owner`, `admin`, `viewer`; `status` includes `active`, `suspended`, `invited`.
- `business_members.role` includes `manager`, `staff`, `viewer` — **not** owner.
- Existing `public.is_business_member(target_business)` grants membership if either an active business member OR any active organization member matches `auth.uid()`. **This is not an Owner approval check.**
- Owner decision RPC must independently require `auth.uid() IS NOT NULL` and an active `organization_members` row with `role = 'owner'` for the organization linked to the request's business, and check that ownership still holds when deciding.
- If multiple active organization Owners exist, define whether any one can approve and revoke. Do not silently assume one Owner per organization.
- Owner ID recorded on a request must be selected using a verified rule. Prefer request targeting a specific Owner (or an organization-level approval queue) rather than arbitrary first matching owner.

## Verified provider authorization

- `v3_is_provider_member()` checks active `provider_admins` for `auth.uid()`.
- `v3_is_provider_admin()` additionally checks JWT `aal = 'aal2'`.
- Support RPCs must re-check this at every privileged call, not just when the request is created.
- Provider must not gain a `business_members` or `organization_members` row to access customer landing data.

## Verified RLS policy boundaries

- `businesses_select`, `business_members_select`, and `landing_page_settings_select` use `is_business_member(...)` for authenticated reads.
- `organizations_select` and `organization_members_select` allow active organization members, not exclusively owners.
- `provider_admins_self_select` permits only the caller's provider row.
- No direct provider access to `landing_page_settings` should be added. Dedicated RPCs must enforce provider identity, business binding, approved scopes, session validity, annual term and audit atomicity.
- Existing `v3_assert_business_term_writable` bypasses term checks for provider admins. New support RPC must check `v3_business_terms.expires_on` directly under transaction and decide policy for missing term records.

## RLS / definer implementation risks

- Existing helpers are SECURITY DEFINER. New functions must have reviewed owner privileges, explicit auth checks, narrow grants, and a hardened `search_path`.
- Do not assume RLS automatically constrains SECURITY DEFINER code.
- Existing `v3_update_landing_page_settings_with_youtube` checks `is_business_member`, so it cannot simply be called by Provider Support without bypass or new dedicated scoped update logic.
- Audit append and scoped mutation must be in the same database transaction; failure must roll back both.
- No new direct table policies for Provider.

## Unresolved before executable migration

1. Verify existing organization membership uniqueness and actual Owner workflow (without reading user PII).
2. Inspect canonical landing field validation and which fields each support scope can edit.
3. Inspect exact business term semantics for missing records and same-day expiry.
4. Review privileges of existing functions and table RLS grants.
5. Determine session lifecycle: approved immediately starts a 30-minute session vs separately started on demand.
6. Run offline database tests, race tests and full app build before requesting production approval.

**Decision: keep Provider Support feature flag OFF. This audit does not authorize deployment.**
