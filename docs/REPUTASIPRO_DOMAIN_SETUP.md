# YukReview V3 domain setup

Selected hostname: `reputasipro.ulasantoko.space`. Screenshots confirm valid Vercel domain configuration and a DNS-only CNAME. After the user switched the domain to the cleanup preview branch, the domain shows YukReview with ID/EN controls. The user ran migration 0038 successfully; newly provisioned ULAS-01007 has the selected hostname. Exact deployment metadata and signed-out preview protection still need verification. V1, WiV1 and the apex domain remain on their existing services.

1. In Vercel project `ulasantoko-review-v3`, add this hostname under Settings → Domains. Add only the CNAME host `reputasipro` at the current DNS provider, using the exact target shown by Vercel. Do not change apex DNS or nameservers.
2. Confirm which deployment the hostname serves. The tested code is currently on `cleanup/production-surface-v1`; `main` has not been released. A default production domain can therefore show the old application. Verify the release/deployment assignment before directing customers or writing physical cards.
3. Check HTTPS, `/activate/ULAS-01006`, `/ULAS-01006` and `/dashboard` on the new hostname. Check signed-out public access and sign-in. Do not print/write a card until its exact URL works.
4. In the standalone V3 Supabase project, add `https://reputasipro.ulasantoko.space/activate/**` to Auth redirect URLs. Set Site URL to `https://reputasipro.ulasantoko.space` when this hostname is ready to serve customers. Keep the existing preview redirect during testing. Activation signup/resend uses the browser's current origin automatically. Test a newly sent confirmation email.
5. After these checks, run `supabase/migrations/0038_reputasipro_card_domain.sql` in the V3 SQL Editor. It requires the PIN helper from 0037, backs up the deployed provider-create function privately and changes only new cards' generated QR/NFC URLs. It preserves provider authorization and cryptographic PIN generation. It does not rewrite existing stored URLs or physical cards.
6. Confirm the next dedicated test card has both QR and NFC URLs beginning `https://reputasipro.ulasantoko.space/`, then test activation/public routing. A targeted rollback is in `supabase/rollbacks/0038_reputasipro_card_domain_rollback.sql`.

Existing cards require a separate destination audit. `ulasantoko.space/ULAS-00136` previously returned a shortlink 404. Connecting this subdomain does not repair that printed URL. ULAS-01006 was created before migration 0038; its stored URL also remains unchanged. Decide whether to update a shortlink mapping or reprint/rewrite each physical card only after inspecting the current destination.

Custom SMTP for email delivery remains a separate setup step. No SMTP credentials or DNS email records have been configured by this change.

## Provider QR download

The creation result and each inventory card now offer Download QR (PNG) / Unduh QR (PNG). Generation happens locally in the browser using the exact stored QR URL, a white background, black modules, four-module quiet zone and whole-pixel scaling. PINs are not encoded. Disabled QR settings disable the inventory download button. Existing cards retain their stored destination; downloading them does not migrate their URL. Validate the printed QR with a phone before physical production.

`npm run test:qr` decodes generated PNGs with an independent decoder to verify exact destinations and checks language, error handling and disabled state. A physical printed-card scan and actual browser download remain live smoke checks.
