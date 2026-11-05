# STEP 2.33 — Landing field mapping and business-term validation audit

Source: read-only Supabase pg_get_functiondef inspection of `v3_update_landing_page_settings`, `_with_tiktok`, `_with_youtube`, `v3_get_business_term`, `v3_assert_business_term_writable`, and `v3_provider_renew_business_year`. No database writes.

## Exact allowlisted scope mapping — proposed

| Scope | Existing fields / target | Important constraint |
|---|---|---|
| landing.text | landing_page_settings.hero_title, hero_description, about_text, promo_text | Only these four fields; no arbitrary JSON merge |
| landing.theme | landing_page_settings.theme_key, cover_position | theme_key in warm_brown, soft_smoothie, soft_tosca, elegant_cream, minimal_dark; cover_position in center, top, bottom, left, right, top-left, top-right, bottom-left, bottom-right |
| landing.google_review | landing_page_settings.show_google_review; google_review_profiles.review_url | Review URL is stored in separate table; must review canonical link validation and upsert behavior before authorizing changes |
| landing.whatsapp | landing_page_settings.show_whatsapp; businesses.whatsapp_number | WhatsApp number stored on businesses, not landing_page_settings; require explicit number validation |
| landing.instagram | landing_page_settings.instagram_url, show_instagram | Existing function HTTPS instagram.com validation; align with actual existing canonical validator |
| landing.tiktok | landing_page_settings.tiktok_url, show_tiktok | Existing TikTok validator accepts HTTPS www.tiktok.com, tiktok.com, vm.tiktok.com, vt.tiktok.com; max 2048 chars |
| landing.youtube | landing_page_settings.youtube_url, show_youtube | Existing YouTube validator accepts HTTPS youtube.com, www.youtube.com, m.youtube.com, youtu.be; max 2048 chars |

Excluded from Provider Support: logo_url, cover_url, pdf_title, pdf_url, show_pdf, card management, business name/category, billing, credentials, media upload/delete, owner transfer, private feedback. Do not add scope merely because a column exists.

## Existing update behavior

- Base `v3_update_landing_page_settings` checks auth.uid and `is_business_member`, validates theme/cover position/URLs, then UPSERTs multiple landing fields in one call.
- TikTok and YouTube wrappers call the base update function and then update their respective fields.
- Provider Support MUST NOT reuse the broad full-field upsert because it could overwrite fields outside the approved scope. Implement a separate narrowly mapped UPDATE, after locking the exact session/business rows and re-checking authorization.
- For cross-table scopes (Google Review, WhatsApp), do not implement until canonical existing validators and constraints have been inspected.

## Annual term semantics verified

- `v3_get_business_term` returns `enabled:false` if there is no row in `v3_business_terms`.
- Term is stored in `v3_business_terms.expires_on` (date); current logic uses `(now() at time zone 'Asia/Jakarta')::date`.
- Existing `v3_assert_business_term_writable` returns early for provider admins. Support RPC must NOT rely on this helper for term authorization.
- A term is expired if `expires_on < today_Jakarta`; same-day expiry is not expired by that check.
- Policy decision pending: missing term row should fail closed for Provider Support unless product owners explicitly approve a compatible legacy exception.
- Existing renewal uses business-row lock and revision, so support edits should lock the business row before term check to serialize with renewal and revocation operations where relevant.

## Security blockers / next review

1. Verify existing Google Review link validation and WhatsApp number format; do not enable those scopes until reviewed.
2. Determine whether theme scope includes cover_position or only theme_key; ensure Owner sees exactly what they approve.
3. Validate field value length, control characters, and URLs against existing UI constraints.
4. Confirm business active, organization active, Owner still active, and term present/not expired in each privileged RPC.
5. Test cross-table writes and audit rollback in offline database with synthetic records.
6. All implementation must remain feature-branch-only and inactive until separate deployment approval.

Status: compatibility design; no executable migration, no deployed RPC, no production changes.
