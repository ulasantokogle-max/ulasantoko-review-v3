-- Verify Landing Page Media Upload V1
select
  exists (
    select 1 from storage.buckets
    where id = 'landing-media' and public = true
  ) as landing_media_bucket_public,
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'landing_media_authenticated_insert'
  ) as upload_insert_policy,
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'landing_media_public_read'
  ) as public_read_policy;
