# Annual service terms — V3

Install `supabase/migrations/0048_business_annual_renewal.sql` in the V3 Supabase SQL Editor after existing migrations. Deployment alone does not install database migrations.

This migration is additive and repeatable. It creates two private tables and three scoped RPCs. It does not backfill dates, alter business/card status, change public card RPCs, or block QR/NFC, reviews, PDFs, activation or dashboard access.

Provider → Cards → Masa Aktif & Perpanjangan:
- Select a business and start a one-year term after manually verifying payment.
- Later choose Perpanjang 1 Tahun and confirm. No payment is automatically collected.
- Early renewal adds one calendar year to the current expiry. An expired term starts from today's WIB date. The displayed expiry date is inclusive.
- All cards in a business share one term. Existing businesses remain unconfigured until a provider starts a term.
- Customer dashboard shows the date and reminders during the final 30 days, including the last 7 days, last day and expiry. Email/WhatsApp delivery and automatic payment are not part of this release.

Security: only an active provider with JWT aal2 may list/manage terms. Customers may read only their own business term. Direct table access is denied to anonymous/authenticated clients. Row locking and expected revisions prevent competing renewals; persistent request IDs make retrying a lost response idempotent. Renewal events retain the previous/new date and provider identity.

Validation: annual-renewal-db.cjs uses isolated PostgreSQL/PGlite to verify permissions, idempotence, stale requests, date preservation, expired renewals and repeatable installation. annual-renewal-ui.cjs verifies confirmation, retry identity, reminders and unchanged legacy presentation.

## Dashboard management lock (0049)

Run `0049_expired_dashboard_write_lock.sql` after 0048. Annual expiry leaves login, dashboard reads/analytics, public landing pages, QR/NFC, Google review destinations, PDF reads and incoming private feedback available. Customer edits, card management, feedback status changes and expired-business media writes are blocked until renewal. A date is valid through the end of its WIB calendar day; an unconfigured business remains writable.

Table triggers enforce the term on customer writes, including SECURITY DEFINER RPCs and direct API attempts. Old and new business IDs are checked to prevent moving records out of an expired business. Provider operations require the existing MFA check and remain available. Storage adds restrictive write policies; existing public reads are untouched. New uploads include the business ID in their path. Referenced legacy assets from an expired business cannot be changed or deleted through customer storage access.

Google setup/resolver checks the selected business term before quota reservation or outbound lookup. The UI disables management forms while preserving their contents. It rechecks every minute; refresh immediately after a provider renewal to unlock. Renewal preserves data and requires no card rewrite or QR reprint.

After installing, verify with a disposable test business: expired dashboard fields are disabled; direct edit RPC rejects `BUSINESS_TERM_EXPIRED`; its public QR/NFC still works; provider renewal re-enables editing. Do not change a real customer's expiry solely for testing.
