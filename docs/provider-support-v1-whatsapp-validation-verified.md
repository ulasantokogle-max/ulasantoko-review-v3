# STEP 2.35 — Canonical WhatsApp validation verified

Read-only inspection of production V3 Supabase function definitions and feature-branch UI. No changes to production.

## Verified canonical RPC

`public.v3_update_business_contact_settings(p_business_id uuid, p_whatsapp_number text)`:

1. Requires `auth.uid()` and `public.is_business_member(p_business_id)`. This is NOT sufficient for Provider Support, so do not call this member-only RPC from provider sessions.
2. `regexp_replace(coalesce(input, ''), '[^0-9]', '', 'g')` strips non-digits.
3. Empty becomes SQL NULL.
4. If first digit is `0`, replaces initial 0 with `62`; else if starts `8` and not `62`, prepends `62`.
5. Non-null result must match `^[0-9]{8,16}$`; otherwise returns INVALID_WHATSAPP_NUMBER.
6. Updates `public.businesses.whatsapp_number` only when business status active.
7. Returns URL as `https://wa.me/` + normalized number.

Existing `v3_get_business_contact_settings` and `v3_get_public_business_contact` construct the same wa.me URL.

Feature-branch UI `app/dashboard/landing-page/page.tsx` calls this RPC and states that inputs beginning 08, 628 or +628 are normalized.

## Support RPC design implications

- Implement narrow, atomic support-only mutation after checking provider AAL2, active provider, exact business, approved scope `landing.whatsapp`, valid unrevoked <=30min session, current Owner authorization, business/organization status, term validity, and append-only audit.
- Keep canonical normalization behavior compatible with existing Owner UX. However, stripping arbitrary non-digits may turn unexpected input into a valid number; consider stricter input hygiene for Provider Support, documented separately, without changing existing Owner behavior.
- Decide explicitly whether clearing a WhatsApp number (empty input) is allowed in Owner-approved scope. Default recommendation: disallow clearing without explicit confirmation.
- The visibility toggle `landing_page_settings.show_whatsapp` must be treated as a separate allowed field under the same scope.
- Reject writes if no active business row is updated; existing RPC may return success even with zero updated rows.
- Never allow Provider to change unrelated `businesses` columns.

## Security test cases (offline only)

- 081234567890 -> 6281234567890
- 81234567890 -> 6281234567890
- +6281234567890 -> 6281234567890
- Empty -> NULL (only if explicitly authorized)
- Too short, too long, malformed, or unapproved scope -> deny
- Cross-business ID, revoked/expired session, stale MFA, expired term -> deny
- Simulate audit insert failure -> entire update rolls back

No executable SQL, no deployed RPC, no migration. Feature flag OFF.
