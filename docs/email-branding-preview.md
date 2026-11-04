# YukReview email branding — preview only

Status: **NOT DEPLOYED**. This branch is isolated from production.

## Branding
- Avatar: blue chat bubble, white star, two Wi-Fi arcs (latest user-provided identity).
- Header: YukReview logo + tagline "ULASAN JADI PELUANG".
- Support: kontak@yukreview.id.

## Safe integration plan
1. Host the approved logo as a publicly accessible HTTPS image.
2. Locate the active sender: Supabase Auth email templates / custom SMTP using Resend, or direct Resend API.
3. Change only the visual markup of the corresponding email template; preserve the existing confirmation/reset URL variable exactly.
4. Test signup verification, password reset, delivery, and link validity in a non-production environment.
5. Confirm Cloudflare routing and Resend domain verification remain intact before release.

## Security constraints
- No changes to DNS, DMARC, MX, SPF, DKIM, API keys, database, RLS, auth callbacks, or existing production deployment.
- A logo in the email body does not create a Gmail sender avatar. BIMI requires separate eligibility checks and may require a certificate.
- Do not use an unverified image URL.
- The visual HTML preview is available separately as `yukreview-email-professional.html` and uses placeholder variables for integration; it is not yet connected to any live sender.
