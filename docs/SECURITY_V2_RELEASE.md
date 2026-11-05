# V3 security release — 3 October 2026

Code: Next.js 15.5.27; locked dependency resolution; PostCSS 8.5.28 and Sharp 0.35.5 overrides. API JSON bodies are limited to 16 KiB of actual streamed bytes. Google Maps requests require verified login; unavailable limiter results fail closed. Resolver redirects stay within the Google host allowlist, use HTTPS/default ports and have eight-second per-request timeouts. Response headers prevent framing, disable object embeds, and disable content sniffing.

Database migration 0037 preserves existing data and RPC signatures. It adds a card-wide limit of 30 accepted feedback submissions per ten minutes, in addition to the existing session limit of three. Card row locks serialize submissions, including direct Supabase RPC calls. Resolver and activation attempts use per-user transaction locks. Provider PIN generation uses cryptographic random bytes. The landing-media bucket allows JPEG/PNG/WebP/GIF/PDF only, with a ten MiB maximum; the UI retains its stricter five MiB image limit and rejects SVG.

## Apply to the V3 database

No live database credentials or direct connection are available in this session. The user applied the checkpoint and migration 0037 in the standalone V3 Supabase SQL Editor on 3 October 2026; screenshots show both succeeded. Do not apply them to V1 or WiV1.

1. Confirm the selected Supabase project belongs to this standalone V3 repository. Verify earlier migrations through 0036 and current backups.
2. Run `supabase/checkpoints/2026-10-03_pre_security_v2.sql` in the V3 SQL Editor. It saves the affected function definitions and bucket settings in a private schema, without copying customer submissions.
3. Run `supabase/migrations/0037_security_release_hardening_v2.sql`. It runs atomically and requires the checkpoint.
4. Run `supabase/checkpoints/2026-10-03_verify_security_v2.sql`. Sensitive tables must have RLS; browser PIN-table grants must be absent; PIN-helper execute grants must be false; bucket settings and the card cap must match.
5. Test with two dedicated accounts: A can read/edit its own business and feedback; B cannot access A's data or invoke provider creation/reset; anonymous access cannot read private records. Verify provider provisioning, activation, Google Review setup, and a normal public submission.
6. If an actual regression requires rollback, use `supabase/rollbacks/0037_security_release_hardening_v2_rollback.sql`; it restores checkpoint definitions and bucket settings without deleting files or feedback.

## Evidence and remaining release gate

Live screenshots confirm the PIN helper is inaccessible to anon/authenticated roles, and the combined checks for RLS, private-table grants, feedback locking/card cap, and bucket limits all return true. The authenticated public-page editor saved successfully. Card ULAS-00136 renders the saved business content; a two-star submission appears in the owner's feedback inbox as NEW. The high-rating flow opens the Google review form for BANANA KREZZZ KEMUNING. Account B (esbiorevinofficial@gmail.com) activated ULAS-01006 for BISNIS TES B, sees only that card, has an empty feedback inbox and is denied Provider Access. The user also confirms test@ulasantoko.space no longer has provider access after the principal provider was moved to astria.d.prasetyo@gmail.com. These UI checks do not establish live denial of direct cross-account API calls or anonymous access through the protected Vercel preview.

The stored QR link `https://ulasantoko.space/ULAS-00136` displays a short-link-service 404. The dashboard's View Public Page action now opens the same-deployment card route instead of that stored QR URL. This does not change printed QR/NFC destinations or repair the external short-link mapping. That mapping remains a release issue to verify separately.

`npm run test:security` executes PostgreSQL via PGlite with real RLS, SECURITY DEFINER, roles, and pgcrypto; Supabase Auth claim functions and Storage tables are local fixtures. Tests cover tenant isolation, forbidden admin operations, PIN secrecy, storage path ownership, changing session IDs against the card-wide cap, resolver limits, activation lockouts, valid activation, verification SQL, rollback, and reapplication. API tests cover bounded bodies, login checks, limiter failures, unsafe destinations, redirects, and timeout configuration.

`test:language`, `test:public`, production build/type checks, and dependency audit are additional checks. Storage service MIME enforcement, live Auth, actual Vercel/Supabase settings, concurrent load, and the two-account live smoke flow still require verification in the selected V3 project. Card-wide limits reduce session-rotation spam but do not replace upstream traffic controls against a sustained distributed attack. Main release stays pending until live checks pass, per SECURITY_RECOVERY_PLAN.md.

## Selected V3 hostname

The user selected `reputasipro.ulasantoko.space`. DNS and deployment assignment are not yet verified. Follow `YUKREVIEW_DOMAIN_SETUP.md`; migration 0038 changes only future provider-created card URLs after the hostname serves V3. Existing physical/stored links need a separate audit.

## Domain and provisioning evidence update

Screenshots on the new hostname show the public BISNIS TES B page and separate customer dashboards: account A displays BANANA KREZZZ and account B displays BISNIS TES B with zero feedback. After assigning the selected subdomain to the cleanup preview branch, the UI displays YukReview with ID/EN navigation. Migration 0038 reports SQL success and subsequent provider-created ULAS-01007 returns the new hostname in its stored QR/NFC URL. A second-card claim into the same business remains pending. Provider QR PNG downloads are implemented and locally verified by decoding actual generated images; physical scanning/browser downloads remain to be checked.


## Provider MFA update — 3 October 2026

Migration `0039_provider_mfa.sql` separates active provider membership (`v3_is_provider_member`) from operational permission (`v3_is_provider_admin`). Operational permission requires a signed session with `aal2`; absent/unknown levels fail closed even for an active provider with no enrolled factor. Existing create/list/reset RPCs continue to call that operational check. Customer access and public activation are unchanged.

Both `/provider/cards` and `/access` are gated by the enrollment/challenge UI. Until migration 0039 is applied, the new UI fails closed with a migration instruction. Database enforcement is pending manual application in the live V3 project; deploying the UI alone does not enforce MFA on direct live RPC calls.

Follow `PROVIDER_MFA_SETUP.md`. Local PostgreSQL tests cover missing/aal1/unknown claims, aal2 success for active providers, and rejection of customers, anonymous users and suspended providers. UI tests cover setup, invalid codes, successful verification, session downgrade and missing migrations. Build and language checks pass. Actual live authenticator enrollment and direct RPC verification remain pending.
