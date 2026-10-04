# Google request quota — V3

Deploy the matching app, then run the complete `supabase/migrations/0042_google_daily_quota.sql` in the standalone V3 Supabase SQL Editor. Until the RPC is installed, Google Places requests fail closed with the temporary customer message. No new API key is required.

All users share 140 reservations per calendar day in Asia/Jakarta, resetting at 00:00 WIB. Both Google Maps resolver and Google Review setup reserve a slot immediately before calling Google Places Text Search. A database row lock prevents simultaneous users/server instances from exceeding the cap. Failed requests or timeouts after reservation keep their slot, so counts are conservative. Existing per-user rate limiting still applies.

Provider → Card Center shows daily usage, monthly usage against the 5,000-request reference, and notices at 80%, 90%, and 100%. It refreshes every minute while visible or manually. Only active providers with MFA can read the aggregate; customers cannot access counters or modify the table directly. The monthly value is informational; this release only imposes the requested daily cap.

These are V3 reservation counts since monitoring began, not Google Cloud's billable totals. Previous usage, other projects, direct uses of the Google key and Google's billing timezone are outside this counter. Verify actual usage in Google Cloud Billing. A 140/day limit permits at most 4,340 V3 reservations in a 31-day month, without proving zero charges on the shared billing account.

When blocked, customers see: “Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.” The response does not disclose provider quotas or billing. QR/NFC scans, public content and saved review links do not use this Google API and remain available.

Tests cover the 141st reservation being refused globally, daily rollover, month filtering, private counters and provider MFA, both HTTP routes blocking before Google dispatch, and provider notification thresholds. Physical/live configuration verification remains an operator step.
