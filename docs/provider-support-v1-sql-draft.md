# STEP 2.30 — SQL/RPC draft, REVIEW ONLY

**DO NOT RUN THIS DOCUMENT IN SUPABASE.** This is a design contract, not an executable migration. It intentionally contains pseudocode and unresolved schema-specific dependencies. No production schema, functions, grants, policies, or environment variables have been changed.

## Data model

### provider_support_requests
- id uuid primary key, generated server-side
- provider_user_id uuid NOT NULL
- business_id uuid NOT NULL
- owner_user_id uuid NOT NULL (resolved from current ownership records, never client input)
- requested_scopes text[] NOT NULL, validated against strict seven-item allowlist, nonempty, no duplicates
- approved_scopes text[] nullable; subset of requested_scopes, no duplicates
- state text NOT NULL: pending / approved / denied / revoked / expired
- created_at timestamptz NOT NULL DEFAULT now()
- decided_at timestamptz, decision_actor_id uuid
- idempotency_key text NOT NULL with uniqueness bound to provider_user_id
- indexes on (business_id, created_at DESC), (provider_user_id, created_at DESC)

### provider_support_sessions
- id uuid primary key; request_id uuid UNIQUE REFERENCES provider_support_requests(id)
- provider_user_id, owner_user_id, business_id uuid NOT NULL, copied from locked request
- approved_scopes text[] NOT NULL
- started_at timestamptz NOT NULL DEFAULT now()
- expires_at timestamptz NOT NULL
- revoked_at timestamptz NULL; revoked_by uuid NULL
- CHECK (expires_at > started_at AND expires_at <= started_at + interval '30 minutes')
- indexes on (provider_user_id, expires_at), (business_id, expires_at)

### provider_support_audit_events
- id uuid primary key; request_id uuid, session_id uuid nullable
- business_id uuid NOT NULL; actor_user_id uuid NOT NULL
- event_type text NOT NULL: request_created / owner_approved / owner_denied / session_started / landing_updated / session_revoked / session_expired
- scope text nullable, constrained to allowlist if present
- created_at timestamptz NOT NULL DEFAULT now()
- minimal metadata jsonb, no tokens, PIN, private feedback, customer data, or before/after secrets
- append-only: no UPDATE/DELETE privilege for application roles; review stronger owner/trigger protections

## Transaction pseudocode (not runnable SQL)

```text
RPC create_request(business_id, requested_scopes, idempotency_key):
  authenticated uid and AAL2 required
  verify active provider via existing canonical helper
  verify target business exists, active, and term permits support
  resolve actual current Owner from trusted business ownership tables
  validate scope allowlist, uniqueness, request size
  insert pending request; append request_created audit atomically
  return minimal request ID/status

RPC owner_decide(request_id, approve, approved_scopes):
  require auth.uid() equals current Owner for the business (not merely business member)
  SELECT request FOR UPDATE; require pending and ownership unchanged
  reject scopes outside requested set, empty approvals, duplicates
  if approved: insert one session with server time and <=30min expiry
  update request state; append owner_approved/owner_denied and session_started audit
  commit atomically; any audit failure rolls back all writes

RPC update_landing(session_id, scope, patch):
  require active provider and fresh AAL2 on this invocation
  SELECT session FOR UPDATE; verify exact provider, business and request binding
  verify not revoked, now() < expires_at, duration <=30min
  verify business active and writable annual term inside this transaction
  validate scope in approved scopes and narrow patch schema
  lock target landing row; update ONLY mapped field(s)
  append landing_updated audit atomically; failure rolls back update
  no generic SQL, arbitrary JSON merge, unrestricted media, or ownership mutation

RPC revoke_session(session_id):
  require current verified Owner for the business, or separately approved provider self-revoke policy
  SELECT session FOR UPDATE; mark revoked_at using server clock
  append session_revoked audit atomically; idempotent repeated revoke
```

## RLS and grants — fail closed

1. ENABLE ROW LEVEL SECURITY and FORCE ROW LEVEL SECURITY on all three tables.
2. REVOKE ALL on tables from anon and authenticated; never expose direct writes.
3. Create narrowly scoped SECURITY DEFINER RPCs with SET search_path = '' and fully qualified objects.
4. REVOKE ALL EXECUTE on each new RPC FROM PUBLIC, anon; GRANT EXECUTE only to authenticated as required.
5. Verify function owner privileges and RLS interactions; a SECURITY DEFINER owner may bypass RLS, so explicit checks inside RPC are mandatory.
6. No client-side authority from actorIsVerifiedOwner, request IDs, scopes, timestamps, or UI feature flags.
7. No service_role credential in client code or public API response.

## Mandatory pre-implementation checks

- Read actual schema and current migration sequence (0036–0051 known historically; confirm repository before naming migration).
- Confirm canonical ownership relation, provider MFA helper, provider active status, annual term helper, and landing update fields.
- Decide whether an approved request immediately creates the session or Owner must separately start it; lock lifecycle before SQL.
- Add database tests for race conditions, cross-business IDs, revoked/expired sessions, stale MFA, audit failure rollback, idempotency, and invalid payloads.
- Run offline SQL tests in a disposable synthetic database, plus full TypeScript and Next build.
- Obtain explicit approval for any future migration, environment changes, or production deployment.

**Status: DRAFT ONLY. No SQL executed.**
