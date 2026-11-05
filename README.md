# YukReview V3

Standalone Google Review Card platform.

## Isolation

V3 is intentionally separate from:
- `ulasantoko-review-card` (V1)
- `WiV1`

V3 uses its own repository, Supabase project/database, Vercel project, environment variables, migrations, and deployment.

## Architecture

- Card Factory / provisioning
- QR custom foreground/background colors, no logo
- NFC provisioning
- Customer PIN activation
- Landing Page draft/publish versioning
- Google Review profile per business
- Private 1–3 star feedback with customer contact data
- Hourly/daily/weekly/monthly analytics
- Multi-business / multi-card
- SaaS plans and entitlements
- Audit logging

## Database

The initial migration is under `supabase/migrations/0001_v3_foundation.sql`.

No V1/V2 tables are referenced by this migration.
