# Editor draft persistence

Repeated Supabase `SIGNED_IN` events (for example when returning to a browser tab) and routine token refresh previously switched the dashboard gate to `checking`, unmounting the editor and discarding unsaved React state.

The gate now keeps children mounted during rechecks for the same previously approved identity and JWT assurance level. Sign-out, different users, unknown tokens and assurance-level changes immediately return to access checking. Database authorization and provider MFA checks remain unchanged; unsuccessful rechecks block access.

Landing page edits are saved in tab-scoped `sessionStorage`, separately for each account and business, after authenticated settings successfully load. Drafts include page settings, business display name, WhatsApp and Maps input. They never include login passwords, tokens, activation PINs or file contents. Completed upload URLs can be recovered; a file still uploading cannot be recovered after closing/reloading the page.

Refreshing the same tab restores its draft after successful business access checks. Drafts do not consume Google API quota and do not publish public pages. **Simpan Perubahan** still applies the changes. Failed saves retain the draft; successful complete saves clear it. Drafts from other businesses are preserved. Malformed or unavailable browser storage does not crash the editor; unavailable storage displays a save reminder. Closing the tab can discard its draft; this is not cloud synchronization or a backup.

Late settings responses cannot overwrite another business's editor, and editing is disabled while loading/saving. The update cannot recover inputs already lost before draft persistence was installed.

Validation: `node tests/landing-draft.cjs`, `npm run test:mfa`, `npm run test:language`, `npm run build`. No SQL migration is required.
