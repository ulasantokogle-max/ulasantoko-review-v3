# Random card URLs — V3

Deploy the matching V3 application before running `supabase/migrations/0041_random_card_public_ids.sql` in the V3 Supabase SQL Editor. Provider MFA migration 0039 is required first. Run the entire SQL file, then reload Provider → Cards or Dashboard → Cards.

Each existing and new card receives a stable, unique 12-character random hexadecimal public ID, for example `https://reputasipro.ulasantoko.space/a7c93e10b842`. The example is illustrative, not a real card link. Downloaded QR codes and NFC write URLs use this URL after migration. The `ULAS-...` inventory number, card ownership, activation PIN and business assignment stay the same.

Previously printed QR codes and written NFC tags keep their original payload and continue working through the legacy V3 URL. To put the new URL on a physical card, download/print a new QR or rewrite the NFC tag. Changing the stored URL cannot change existing physical media.

Random URLs resolve to the original card code for activation, feedback and public content. Unknown and suspended-card IDs do not resolve. IDs are public locators; authentication, PIN checks, tenant access controls and provider MFA remain necessary. Running the migration again does not rotate IDs.

Validation: isolated PostgreSQL tests cover migration reruns, uniqueness, immutable IDs, provisioning, activation/claim, legacy URLs, unknown/suspended IDs and access guards. Public rendering tests cover landing pages, PDF menus and activation redirects. The live migration and physical scans must still be verified by the operator.
