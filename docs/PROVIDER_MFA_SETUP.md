# Provider authenticator setup

This change belongs to standalone YukReview V3 only. Do not run it in V1 or WiV1.

## Enable enforcement

1. Deploy the cleanup branch containing ProviderMfaGate before applying the SQL so the provider has a working enrollment screen.
2. In the V3 Supabase SQL Editor, run the entire `supabase/migrations/0039_provider_mfa.sql` after 0038. It is atomic and repeatable, and changes no cards, customers or provider membership. No separate checkpoint is required for this migration.
3. Run `supabase/checkpoints/2026-10-03_verify_provider_mfa.sql`. All four checks must be true. These definition checks do not substitute for real login/RPC tests.
4. Open `https://reputasipro.ulasantoko.space/provider/cards`. Log in as the active provider, then select **Siapkan Authenticator**.
5. Add the displayed QR to an authenticator app. On the same phone, open **Kunci pengaturan manual** and enter that key in the authenticator. Keep QR/key private; do not send screenshots of them.
6. Enter the current six-digit code and select **Verifikasi dan masuk**. Inventory is only shown after verification. Signing in again with password requires a new authenticator code.

Supabase TOTP enrollment and verification must be enabled under the project's Auth MFA settings if previously disabled. No SMTP or SMS service is needed for TOTP. The setup QR is an authenticator secret, distinct from customer card QR codes.

## Verify live behavior

- Password-only provider session: direct create/list/reset RPC calls return FORBIDDEN.
- Verified active provider: inventory loads; creation/reset work on a dedicated test card.
- Ordinary customer, including a customer with MFA: provider access stays denied.
- Sign out and sign in again: authenticator code required before inventory.
- Customer activation and normal customer dashboards still work without enrolling provider MFA.

## Recovery and limits

Keep a secure backup using the authenticator's own backup/export feature before replacing the phone. This implementation does not issue recovery codes or allow users to bypass MFA. If the factor is lost, an authorized project administrator must verify the provider's identity and reset that account's MFA factors through Supabase Auth administration, then the provider enrolls again. Do not remove the database guard as routine recovery.

MFA protects password-only sessions. A stolen already-verified session token remains usable until it expires or is revoked. First-time setup also assumes the legitimate provider controls the account; enroll promptly and protect its email/password. Project administrators and service-role credentials remain privileged and must stay outside browser code.

References: https://supabase.com/docs/guides/auth/auth-mfa and https://supabase.com/docs/guides/auth/auth-mfa/totp

Validation: `npm run test:security`, `npm run test:mfa`, `npm run test:language`, `npm run build`.

## Dashboard navigation fix

Provider MFA screens no longer offer a Dashboard escape link. The dashboard layout uses the same gate for active providers, so direct entry to any `/dashboard` route also requires verification before customer page components mount. Ordinary customer sessions continue without mandatory provider MFA. Existing migration 0039 enforces provider create/list/reset RPCs; this navigation fix requires no additional SQL. This does not introduce a universal MFA requirement for customer RPCs.

## Add a backup authenticator

After verifying the existing factor, open **Keamanan 2FA** in the Provider Portal, or `/provider/security`. Give the backup a name, select **Tambah Authenticator Cadangan**, and add the new QR/manual key to the backup authenticator. Enter a code from that backup to activate it. Existing verified factors are preserved; only unfinished setups made by the backup screen are cleaned up on a new attempt. Cancelling deletes only the current unverified setup.

The login screen lists all verified TOTP factors when more than one is present. Select the matching authenticator before entering its code. Switching the selection clears the previous code. A backup has its own secret and is an alternative second factor; the provider does not need both codes for one login. No new SQL is needed beyond migration 0039. Provider membership plus AAL2 is checked again before enrollment begins.

Mocked UI checks cover backup selection, invalid/valid verification, cancellation, provider denial and preservation of existing factors. A real backup setup and subsequent login still need testing in the live V3 project. The app displays no verified factor secrets, and sends no keys to third-party TOTP websites.
