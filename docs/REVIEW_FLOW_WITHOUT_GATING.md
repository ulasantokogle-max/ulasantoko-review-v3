# V3 review flow without rating selection gates

Google reviews open directly from a persistent link. Private feedback is an independent, optional action. Internal ratings 1–5 never redirect, hide, or disable the Google link. Feedback success, validation errors, database unavailability, and network errors leave Google access unchanged. No star is selected by default.

## Deployment and database

Apply `supabase/migrations/0044_feedback_without_review_gating.sql` in the **V3 project's** Supabase SQL Editor after 0043. It widens the internal rating check and hardened submission RPC to 1–5, adds 4/5 buckets to both analytics RPCs, and publishes a readiness marker. Existing feedback is retained; tenant authorization, spam caps, duplicate detection, contact consent, and deleted-card exclusions are preserved. The migration is transactional and repeatable.

The website checks the marker with its anonymous key. Before migration 0044 is applied, or if the marker cannot be read, Google remains directly available and private feedback displays a temporary-unavailable message for everyone. It does not fall back to accepting only low ratings. Refresh the public page after applying the migration.

The public editor preview disables links and private actions. All five themes share the same layout. Internal dashboard averages and distributions are explicitly labeled as internal, separate from Google's ratings.

## Operational policy

Ask all customers consistently for honest reviews, without filtering by satisfaction, incentives, pressure, requested star counts, or required review text. Handling a complaint must not be conditional on changing or deleting a Google review. This removes the application's rating-based gate; it does not guarantee Google approval or a particular rating.

Sources reviewed 2026-10-05: https://support.google.com/contributionpolicy/answer/7400114 and https://support.google.com/business/answer/3474122.
