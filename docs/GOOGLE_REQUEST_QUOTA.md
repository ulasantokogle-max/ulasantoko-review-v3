# Google request quota — V3

The original counter uses `supabase/migrations/0042_google_daily_quota.sql`. The current release also requires `0046_google_quota_server_only.sql`; do not rerun 0042 after 0046 because it restores the older reservation permissions.

Set `SUPABASE_SECRET_KEY` in the V3 Vercel environment to a secret API key from the same V3 Supabase project (Settings → API Keys). A legacy `SUPABASE_SERVICE_ROLE_KEY` also works. Use a Vercel Secret value, never a `NEXT_PUBLIC_` variable, and never paste the value into chat or GitHub. Redeploy the matching V3 branch/environment, then run the complete 0046 migration in the V3 SQL Editor. The migration changes reservation permissions and preserves existing counters. Missing server configuration blocks new Google lookups with the temporary customer message.

Authenticated browser clients, including providers, cannot call the reservation RPC after 0046. Only the separate server client can reserve. HTTP routes first validate the user's session, active business access and per-user throttle using that user's JWT. The setup endpoint requires ownership of the exact business before any outbound call. Accounts without an active business cannot use the standalone resolver.

All users share 140 reservations per calendar day in Asia/Jakarta, resetting at 00:00 WIB. Both Google Maps resolver and Google Review setup reserve a slot immediately before calling Google Places Text Search. A database row lock prevents simultaneous users/server instances from exceeding the cap. Failed requests or timeouts after reservation keep their slot, so counts are conservative. Existing per-user rate limiting still applies. Saving an unchanged Maps link reuses the account-scoped active saved profile, consuming no Google request even when quota is exhausted.

Provider → Card Center shows daily usage, monthly usage against the 5,000-request reference, and notices at 80%, 90%, and 100%. It refreshes every minute while visible or manually. Only active providers with MFA can read the aggregate; customers cannot access counters or modify the table directly. The monthly value is informational; this release only imposes the requested daily cap.

These are V3 reservation counts since monitoring began, not Google Cloud's billable totals. Previous usage, other projects, direct uses of the Google key and Google's billing timezone are outside this counter. Verify actual usage in Google Cloud Billing. A 140/day limit permits at most 4,340 V3 reservations in a 31-day month, without proving zero charges on the shared billing account.

When blocked, customers see: “Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.” The response does not disclose provider quotas or billing. QR/NFC scans, public content and saved review links do not use this Google API and remain available.

Tests cover the 141st reservation being refused globally, daily rollover, month filtering, private counters and provider MFA, both HTTP routes blocking before Google dispatch, and provider notification thresholds. Physical/live configuration verification remains an operator step.
