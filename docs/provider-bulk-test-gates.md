# Provider Bulk — Test gate and remaining risks

## Current status
The bulk UI exists on this feature branch, **not deployed**. No cards were created during this review.

## Test evidence
Node v22.16.0 ran the ten static assertions against a **local fixture**, returning `PASS bulk creator static safety checks (10)`. This is **not** a verified test of a full checkout of the GitHub file. It must not be counted as an end-to-end pass.

## Required verification before merge
1. Clone the actual feature branch and run `node tests/provider-bulk-static-safety.cjs`, `npx tsc --noEmit`, and the app build.
2. Mock `supabase.rpc("v3_provider_create_card")` and test 1, 25, invalid quantity, RPC failure at index 8, duplicate code, rejected response, and unexpected network failure.
3. Verify 7 successful cards remain exportable when the eighth RPC fails; do not automatically retry ambiguous failures.
4. Parse exported CSV with commas, quotes, line breaks, and formula-prefixed label fields; ensure 7 columns per row and no spreadsheet formula execution.
5. Verify that PINs are never sent to logs or persisted in browser storage. Check user-confirmed download does not assert filesystem save success.
6. Verify provider MFA and permission checks occur server-side in the existing RPC; ensure no bypass via direct RPC calls.
7. Test logout/account switch during a running batch, and browser navigation with unexported PINs.

## Open risk
A duplicate code response might already correspond to a committed database write; stop and reconcile inventory. Existing `v3_provider_list_cards` is capped at 500 and the UI currently requests 200. For large production runs, a dedicated paginated inventory/export reconciliation flow will be needed.

## Safety boundary
No production branch edits, migrations, Supabase writes, feature flag activation, or deployments without separate approval.
