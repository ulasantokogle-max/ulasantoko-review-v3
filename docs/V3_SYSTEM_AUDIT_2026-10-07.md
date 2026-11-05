# V3 system audit — 7 October 2026

Scope: application code, migration integration and automated regression checks for activation, tenant access, provider MFA/CAPTCHA, card aliases/QR/NFC, feedback, landing drafts/uploads, PDF rendering, Google access/quota and annual dashboard management.

## Corrections

- Landing image/PDF uploads now release their busy state on thrown errors and time out after 60 seconds. Requests capture the account/business draft identity; late results cannot populate a different business form. Unique file paths include the business UUID required by the annual storage write guard.
- Missing or failing annual-term RPCs now lock customer management and deny Google API work. Businesses explicitly returned as unconfigured remain usable. The previous missing-RPC compatibility bypass was removed after the reported installation of 0048/0049.
- Annual status polling ignores superseded responses, so an older request cannot override a newer lock result.

## Verification

- All 21 automated V3 suites passed, including activation/alias permissions, provider MFA/CAPTCHA, cross-business isolation, quota limits, neutral public feedback, draft persistence, upload failure/retry/business switches and annual renewals.
- Database integration uses PGlite and repository migrations. Expired terms reject customer display-name/contact/Google edits; public landing payload remains identical, new anonymous feedback succeeds, and provider renewal restores customer edits.
- Missing-term-RPC regressions verify both disabled customer controls and Google rejection before outbound API work.
- Production Next.js build passed. Dependency audit reported zero known vulnerabilities for the installed dependency tree. No dependency changes in this patch.

## Release requirements and limits

No new SQL migration is introduced. This release requires 0048 followed by 0049, reported installed by the project owner; production database installation was not independently inspected during this audit.

Automated results are not production penetration testing. Authenticated production journeys, actual mobile PDF behaviour for the Harade card, physical NFC writing and email delivery require live-device/account verification. The full Harade public card URL has not been supplied. Production expiry dates and renewal actions were not changed by the test run. Email/WhatsApp renewal reminders and automatic payments remain outside the current feature scope.
