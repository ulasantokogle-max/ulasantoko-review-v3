# V3 security release — 3 October 2026

Code: Next.js 15.5.27; locked dependency resolution; PostCSS 8.5.28 and Sharp 0.35.5 overrides. API JSON bodies are limited to 16 KiB of actual streamed bytes. Google Maps requests require verified login; unavailable limiter results fail closed. Resolver redirects stay within the Google host allowlist, use HTTPS/default ports and have eight-second per-request timeouts. Response headers prevent framing, disable object embeds, and disable content sniffing.

Database migration 0037 preserves existing data and RPC signatures. It adds a card-wide limit of 30 accepted feedback submissions per ten minutes, in addition to the existing session limit of three. Card row locks serialize submissions, including direct Supabase RPC calls. Resolver and activation attempts use per-user transaction locks. Provider PIN generation uses cryptographic random bytes. The landing-media bucket allows JPEG/PNG/WebP/GIF/PDF only, with a ten MiB maximum; the UI retains its stricter five MiB image limit and rejects SVG.

## Apply to the V3 database

No live database credentials or direct connection are available in this session. These SQL changes have NOT been applied to live Supabase. Do not apply them to V1 or WiV1.

1. Confirm the selected Supabase project belongs to this standalone V3 repository. Verify earlier migrations through 0036 and current backups.
2. Run `supabase/checkpoints/2026-10-03_pre_security_v2.sql` in the V3 SQL Editor. It saves the affected function definitions and bucket settings in a private schema, without copying customer submissions.
3. Run `supabase/migrations/0037_security_release_hardening_v2.sql`. It runs atomically and requires the checkpoint.
4. Run `supabase/checkpoints/2026-10-03_verify_security_v2.sql`. Sensitive tables must have RLS; browser PIN-table grants must be absent; PIN-helper execute grants must be false; bucket settings and the card cap must match.
5. Test with two dedicated accounts: A can read/edit its own business and feedback; B cannot access A's data or invoke provider creation/reset; anonymous access cannot read private records. Verify provider provisioning, activation, Google Review setup, and a normal public submission.
6. If an actual regression requires rollback, use `supabase/rollbacks/0037_security_release_hardening_v2_rollback.sql`; it restores checkpoint definitions and bucket settings without deleting files or feedback.

## Evidence and remaining release gate

`npm run test:security` executes PostgreSQL via PGlite with real RLS, SECURITY DEFINER, roles, and pgcrypto; Supabase Auth claim functions and Storage tables are local fixtures. Tests cover tenant isolation, forbidden admin operations, PIN secrecy, storage path ownership, changing session IDs against the card-wide cap, resolver limits, activation lockouts, valid activation, verification SQL, rollback, and reapplication. API tests cover bounded bodies, login checks, limiter failures, unsafe destinations, redirects, and timeout configuration.

`test:language`, `test:public`, production build/type checks, and dependency audit are additional checks. Storage service MIME enforcement, live Auth, actual Vercel/Supabase settings, concurrent load, and the two-account live smoke flow still require verification in the selected V3 project. Card-wide limits reduce session-rotation spam but do not replace upstream traffic controls against a sustained distributed attack. Main release stays pending until live checks pass, per SECURITY_RECOVERY_PLAN.md.
