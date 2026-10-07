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
