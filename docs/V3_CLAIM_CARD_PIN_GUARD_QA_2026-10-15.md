# V3 claim-card PIN guard: staging QA gate

DO NOT MERGE OR APPLY TO PRODUCTION BEFORE QA.

## Mandatory drift check
Export the entire current live pg_get_functiondef for public.v3_claim_card and compare to migration 0037. If function behavior differs, update this patch to reflect the actual live logic before any application.

## Tests in isolated staging
1. New account: valid PIN and new business activation.
2. Existing account: valid PIN and second card to same business.
3. Wrong PIN: attempt increment and lockout preserved.
4. NULL or empty pin_hash in staging fixture: deny activation and leave card unclaimed.
5. NULL/blank supplied PIN: deny activation.
6. Wrong account cannot claim activated card.
7. Anonymous RPC call cannot claim a card.
8. Member authorization still denies other businesses.
9. PIN reset, QR/NFC, login, recovery, and provider smoke tests.
10. Confirm grants, schema, rollback and backup.

Existing V3 Production remains unchanged; separate legacy v3_activate_card audit pending.