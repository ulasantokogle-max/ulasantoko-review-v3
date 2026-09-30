# Supabase

Create a NEW Supabase project for V3.

Run migrations in order from `supabase/migrations`.

Never point V3 at the V1 or WiV1 Supabase projects.

Recommended production settings:
- Enable database backups.
- Keep service-role key server-side only.
- Configure Auth redirect URLs for the V3 domain.
- Review RLS policies before production launch.
