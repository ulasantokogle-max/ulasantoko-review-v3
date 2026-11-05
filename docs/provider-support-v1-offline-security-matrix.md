# STEP 2.36 — Offline security test matrix

Scope: **pure policy tests only**, synthetic identifiers, no Supabase calls or production data. Script: `node tests/provider-support-security-matrix.cjs`. Requires repository dependencies (including TypeScript).

| Threat / scenario | Expected | Test layer |
|---|---|---|
| Valid Provider AAL2 + Owner approval + active business/term + matching IDs + approved scope | allow | pure-policy automated |
| Provider inactive, AAL2 missing, Owner approval absent | deny | pure-policy automated |
| Provider/business mismatch (cross-business or cross-provider attempt) | deny | pure-policy automated; DB ID binding still pending |
| Revoked or expired session, session over 30min, future start | deny | pure-policy automated |
| Requested scope outside seven-item allowlist, wildcard, duplicate, escalation | deny | pure-policy automated |
| Non-Owner / wrong Owner / duplicate approval | deny | pure-policy automated; DB owner join pending |
| Missing audit scope, forbidden audit scope | deny | pure-policy automated |
| Flag OFF and route stubs present | remain unavailable | static automated |
| SQL transaction update vs revoke race | deny/rollback | **pending disposable database test** |
| SQL audit failure during edit | entire transaction rolls back | **pending disposable database test** |
| RLS, grants, SECURITY DEFINER privilege boundaries | deny unauthorized access | **pending disposable database test** |
| Expired Jakarta business term, missing term, inactive organization | deny | **pending disposable database test** |
| Google Maps/Place ID and WhatsApp normalization | validate exact canonical rules | **pending offline SQL validation test** |
| Cross-table WhatsApp/Google Review mutation + audit | atomic and scoped | **pending disposable database test** |

Important: passing pure policy tests does **not** demonstrate secure RPCs, production readiness, or successful full Next.js build. This test matrix does not create SQL objects or change the database. Do not run migration until separate authorization.
