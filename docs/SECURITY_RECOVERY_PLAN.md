# UlasanToko Review V3 — Security Hardening Recovery Plan

Checkpoint date: 2026-10-01

## Code rollback
Stable branch before hardening:

`backup/pre-security-hardening-2026-10-01`

Security work happens on:

`security/hardening-v1`

Do not merge hardening changes to `main` until smoke tests pass.

## Database checkpoint
Before applying any RLS/security SQL, manually run:

`supabase/checkpoints/2026-10-01_pre_security_snapshot.sql`

This creates schema:

`backup_20261001`

It snapshots critical application tables, selected Auth metadata, V3 function definitions, current RLS flags, and current policies.

## Recovery rules
1. Prefer reverting the latest security migration rather than restoring whole tables.
2. Never overwrite live customer tables unless we have identified the exact failed migration.
3. For RLS issues, restore/drop only the affected policies first.
4. For RPC issues, restore the previous function definition from `backup_20261001.function_definitions`.
5. For code regressions, deploy the stable backup branch or revert the offending commit.
6. Keep destructive operations out of Security Hardening V1.

## Smoke test after every security change
- Provider can open Card Factory.
- Customer can log in.
- Customer only sees own business/card.
- Card activation still works.
- Google Review setup still works.
- Public card page still works.
- 1–3 star feedback still submits.
- Feedback Inbox still loads for the correct owner.
