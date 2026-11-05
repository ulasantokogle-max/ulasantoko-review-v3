# Provider Support V1 — Database / RPC review blueprint (NOT executable)

Status: DESIGN ONLY. Do not apply to Supabase, do not add SQL to migrations, and do not enable the feature flag. Phase A/B/C routes are intentionally unavailable.

## Threat model / invariants

- Provider is never a business member and must never impersonate Owner.
- Only a currently verified Owner of the exact business may approve or deny.
- Provider must be active and have current JWT AAL2 (MFA); verify again on each privileged operation.
- Request and session are bound to the same provider, Owner, and business. IDs and scopes come from database state, not untrusted request payload.
- Only the seven explicit `landing.*` scopes in `lib/providerSupport/permissions.ts` are supported. No wildcard, card operations, billing, transfer, credentials, private feedback, uploads, or deletion.
- A session expires no later than 30 minutes after server-issued start, with server-side clock and immediate revocation. Revocation and expiry must win races with edits.
- Annual business entitlement and business active status must be checked inside the same transaction as edits. Existing term helper may bypass provider; do not assume it protects support operations.
- Every state transition and landing mutation must generate immutable audit evidence atomically. Fail closed if audit cannot be written.
- Never expose service-role credentials or unrestricted table writes to the browser. No direct provider update on public business tables.

## Proposed database objects (names provisional)

1. `provider_support_requests`: UUID PK, provider_user_id, business_id, owner_user_id, requested_scopes text[], state enum/check, created_at, decided_at, decision_actor_id, approved_scopes text[], unique idempotency key. Enforce scope allowlist and no duplicates in trusted SQL validation.
2. `provider_support_sessions`: UUID PK, request_id unique FK, provider_user_id, business_id, owner_user_id, approved_scopes text[], started_at, expires_at, revoked_at, revoked_by. CHECK expires_at > started_at and <= started_at + interval '30 minutes'. Creation only from approved request.
3. `provider_support_audit_events`: append-only UUID PK, request_id, session_id nullable, business_id, actor_user_id, event_type, scope nullable, created_at server-generated, structured minimal metadata without secrets or customer-private payload. No UPDATE/DELETE grants to app roles.

## RLS / privileges

- Enable and FORCE RLS on all new tables.
- Default deny. No direct INSERT/UPDATE/DELETE for authenticated or anon.
- Read visibility only through reviewed RPCs returning minimum fields; provider sees own request/session metadata, Owner sees only their own business requests.
- SECURITY DEFINER RPCs must set safe search_path, use explicit schema-qualified tables/functions, check auth.uid(), check AAL2 and active provider status, verify actual business ownership and term, validate all scopes, and avoid broad grants.
- Use row locks / transaction boundaries to prevent approve-vs-revoke and update-vs-expiry races.
- Do not rely on client timestamps, client boolean `actorIsVerifiedOwner`, or client scope lists for authorization.

## Proposed RPC contracts (NOT implemented)

- `v3_support_create_request(business_id, requested_scopes, idempotency_key)`: provider AAL2, active, business valid; insert pending request + audit.
- `v3_support_owner_decide(request_id, approve, approved_scopes)`: verify authenticated actual Owner and pending request; lock row; decision + audit; if approved, create one bounded session atomically.
- `v3_support_get_session(session_id)`: minimal metadata for permitted actor; no private landing content.
- `v3_support_update_landing(session_id, scope, field_patch)`: verify provider MFA, current session, business, scope, entitlement, payload allowlist; lock session/business; update ONLY scoped landing fields; append audit in same transaction.
- `v3_support_revoke_session(session_id)`: verify Owner of same business or authorized provider policy; lock session, mark revoked, append audit.
- Do not implement a publicly callable generic `write_audit` RPC.

## Required review / test gates before any migration

- Inspect actual production schema, ownership roles, existing landing update RPCs, MFA helper, business term helper, RLS grants, migration numbering, and API auth flows in read-only mode.
- Confirm no conflicting policies or function names; choose new migration number only after examining repository migration history.
- Test SQL offline on a disposable database with synthetic records: unauthorized provider, stale MFA, non-Owner, cross-business IDs, scope escalation, expired/revoked sessions, duplicate approval, concurrent revoke/update, audit failure rollback, and expired annual term.
- Review security definer ownership, EXECUTE grants, RLS, and audit immutability.
- Run repository test suite, strict TypeScript check, and Next build. Obtain explicit separate approval before any database migration, env change, Vercel deploy, or enabling the flag.

## Current status

This document is a design review artifact, not a migration. No database objects, grants, policies, RPCs, or operational access have been created.
