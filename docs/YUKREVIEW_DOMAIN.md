# V3 domain: yukreview.id

Canonical domain: https://yukreview.id. Application branding: YukReview.

## External configuration

In Vercel project `ulasantoko-review-v3`, assign `yukreview.id` to the tested branch `cleanup/production-surface-v1` (Preview environment), and redirect `www.yukreview.id` to the apex. Verify the new domain serves the current release and opens publicly without Vercel login before distributing new QR/NFC URLs. Keep `reputasipro.ulasantoko.space` assigned to this same branch so printed/written legacy cards still work. Do not create reciprocal redirects between www and apex.

In the **V3** Supabase project, Authentication → URL Configuration:

- Site URL: `https://yukreview.id`.
- Add Redirect URL: `https://yukreview.id/activate/*` (both random IDs and legacy codes).
- Keep the existing `https://reputasipro.ulasantoko.space/activate/*` entry for legacy-card account confirmation.
- Preserve other existing authorized URLs until migration tests are complete.

Activation uses the current browser origin, so customers stay on the domain where they registered. Sessions stored by the browser are separate per domain; a login on the old domain does not automatically log a user into the new one. Project/database/API keys and tenant authorization remain the same. Email sender/SMTP settings are independent and are not configured by a domain change. See [YukReview email setup](YUKREVIEW_EMAIL_SETUP.md) for the prepared `noreply@yukreview.id` SMTP rollout and confirmation template; live sender changes require verified DNS and external Auth configuration.

## Application and database

The provider normalizes trusted card links to the new canonical origin for display, copying, QR generation and NFC writing. The customer dashboard displays the same canonical URL and uses a local path for public-page navigation. Known new, www, and legacy origins can retain the same 12-character public ID. Unknown origins, credentials, non-HTTPS schemes and alternate ports fall back to a safe local legacy-code route.

After the new domain serves V3 and auth is configured, run `supabase/migrations/0045_yukreview_card_domain.sql` in V3 SQL Editor (after 0044). It updates known stored card URLs for future downloads/writes and changes newly provisioned card URLs. It preserves public IDs, PINs, ownership, feedback, and QR/NFC enable flags. Deleted card URLs are untouched. Private backup tables preserve pre-migration URLs and the provider function. Repeating the migration does not overwrite the original backups.

Existing printed QR codes and physical NFC tags are not rewritten. Their old URLs continue to work only while the old domain remains configured for V3.

## Verification

1. Open `https://yukreview.id/dashboard` and verify the current release.
2. Login as the provider, complete MFA, copy/download a card URL and confirm its destination is `https://yukreview.id/<public_id>`.
3. Open the old and new URLs for the same card and verify the same business/activation state.
4. Register a customer from a new-domain activation URL and check the email return stays on the new domain.
5. Check public Google review access and optional internal feedback.

Automated tests cover both activation origins, QR decoding, NFC payloads, URL validation, idempotent SQL, stable aliases, provider MFA and customer activation. DNS/Vercel/Supabase settings and real NFC hardware must be verified separately.
