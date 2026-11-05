# STEP 2.37 — Isolated security-policy execution results

Status: **PASS, isolated synthetic policy checks (36 assertions)**.

## Execution

- Date: 2026-11-05.
- Runtime: Node.js v22.16.0, global TypeScript compiler.
- Method: recreated local copies of `permissions.ts`, `sessionPolicy.ts`, `featureFlag.ts` from the feature branch, plus inert route import stubs; executed a custom standalone assertion runner in an isolated container.
- Command: `NODE_PATH=$(npm root -g) node /mnt/data/provider-support-offline/tests/runner.cjs`
- Output: `PASS isolated synthetic policy checks: 36`
- No Supabase calls, writes, migration, deployment, or production changes.

## Coverage

- Positive valid scope and approved session.
- Fail-closed providerActive, providerAal2, ownerApproved, providerMatches, businessMatches, sessionActive, businessActive, businessTermWritable.
- Revocation, expiry boundary, future start, session over 30 minutes.
- Forbidden scopes and requested-scope duplicates.
- Owner mismatch, unverified Owner, unrequested scope, duplicate approval.
- Audit event scope presence and allowlist.
- Operational feature flag stays false even if configured true.

## Important limitations

- **This is NOT a run of the repository's committed `tests/provider-support-security-matrix.cjs` file.** It is an independently reconstructed, equivalent subset of its policy assertions with two extra feature-flag checks.
- No complete GitHub checkout or dependency installation was performed.
- Full `npm run test:all`, strict TypeScript project check and `next build` were **not run**.
- No PostgreSQL transaction, RLS, SECURITY DEFINER, cross-table update, concurrency, or audit rollback tests were run.
- Passing this test does not validate deployed API authorization or the correctness of future SQL RPCs.
- No fixes were required by these 36 assertions; future tests may reveal defects.

## Next gates

1. Execute the actual committed test files in a verified full repository checkout.
2. Add disposable PostgreSQL tests for Owner authorization, term validity, row locks, revocation/edit race and audit rollback.
3. Review migration SQL and grants before any production change.
4. Keep Provider Support OFF until separate approval.
