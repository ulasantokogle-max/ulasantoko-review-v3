-- Rollback Landing Page Media Upload V1
drop policy if exists "landing_media_authenticated_delete" on storage.objects;
drop policy if exists "landing_media_authenticated_update" on storage.objects;
drop policy if exists "landing_media_authenticated_insert" on storage.objects;
drop policy if exists "landing_media_public_read" on storage.objects;
delete from storage.buckets where id = 'landing-media';
