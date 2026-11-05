# STEP 2.34 — Google Review and WhatsApp compatibility audit

Read-only inspection of current Supabase V3 function definitions, table columns and constraints. No database writes or deployments.

## Google Review: verified

- Canonical RPC: `public.v3_set_google_review_profile(p_business_id uuid, p_maps_url text, p_place_id text)`.
- Requires authenticated user, `is_business_member(p_business_id)`, and business status active. **Cannot be called as Provider without violating membership isolation.**
- Validates trimmed Maps URL: <=2048 characters, HTTPS, Google Maps host pattern; rejects whitespace/control characters.
- Validates trimmed Place ID: <=256 characters and characters `[A-Za-z0-9_-]`.
- Constructs canonical review URL: `https://search.google.com/local/writereview?placeid=` + validated Place ID.
- UPSERTs `google_review_profiles` keyed by unique `business_id`; fields `maps_url`, `place_id`, `review_url`, `status='active'`.
- **Support RPC must reimplement narrow validated update after approved scope, MFA, Owner approval, session, business-term and audit checks.** Do not call the existing member-only RPC or accept caller-supplied review_url.
- Additional tests: malformed URL, host lookalikes, whitespace, invalid Place ID, cross-business ID, revoked session, audit failure rollback.

## WhatsApp: partially verified

- Storage field: `public.businesses.whatsapp_number` (text).
- Visibility toggle: `public.landing_page_settings.show_whatsapp` (boolean).
- Inspected database constraints for businesses and google_review_profiles; no WhatsApp number format CHECK was returned on businesses.
- A canonical WhatsApp number validation function has NOT been confirmed. Avoid claiming it is absent in application code.
- **Keep edits to whatsapp_number blocked** until existing application-side validation and country-code normalization are reviewed. A safe new validator should define E.164-compatible digits, max length, Indonesian 0-to-62 conversion policy, and whether empty values are allowed.
- `show_whatsapp` must not be used to bypass the approval requirement for changing the number itself.
- No provider permission to edit other businesses fields.

## Implementation boundary

- Scope `landing.google_review` should allow only canonical maps_url + place_id and derived review_url plus show_google_review if explicitly displayed to Owner.
- Scope `landing.whatsapp` should allow only validated whatsapp_number and show_whatsapp if explicitly displayed to Owner.
- Both scopes span tables, so changes and audit event must be one database transaction.
- Existing business-member RPCs remain unchanged.
- No executable migration is authorized. Provider Support remains OFF.

## Next

1. Inspect application-side WhatsApp validation and UX to settle canonical normalization.
2. Review scope-specific input schema and Owner approval display.
3. Write offline synthetic tests before preparing executable SQL.
