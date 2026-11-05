# Provider Bulk Create: staging checklist

Do not apply migration 0036 to production until all checks pass.

## Preconditions
- Isolated Supabase staging project and Vercel preview environment.
- Confirm live-compatible schema for cards, card_activation, card_provisioning, audit_logs, and provider_admins.
- Confirm existing card sequence is ahead of existing codes.

## Acceptance tests
1. Anonymous and non-provider requests are rejected.
2. Invalid quantities (0, negative, >100, fractional) are rejected.
3. Batch sizes 1, 10, and 100 create unique codes, 6-digit PINs, and matching QR/NFC URLs.
4. New cards remain unassigned and ready to sell.
5. Duplicate request UUID cannot create more cards.
6. Concurrent provider requests serialize correctly.
7. An exception rolls back the entire batch.
8. Daily provider bulk quota of 500 is enforced.
9. CSV contains only batch-generated cards and correct PINs.
10. Existing single-card creation, PIN reset, and customer activation still work.
11. Typecheck, build, and mobile smoke tests pass.

## Security
- CSV includes raw PINs. Never log or upload CSV publicly.
- Lost response after commit means PINs must be reset using existing unactivated-card workflow.
- Keep PR draft until staging verification is complete.
