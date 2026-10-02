-- UlasanToko Review V3
-- Landing Page Media Upload V1
-- Public bucket with authenticated business-scoped upload paths.

insert into storage.buckets (id, name, public)
values ('landing-media', 'landing-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "landing_media_public_read" on storage.objects;
create policy "landing_media_public_read"
on storage.objects
for select
to public
using (bucket_id = 'landing-media');

drop policy if exists "landing_media_authenticated_insert" on storage.objects;
create policy "landing_media_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'landing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "landing_media_authenticated_update" on storage.objects;
create policy "landing_media_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'landing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'landing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "landing_media_authenticated_delete" on storage.objects;
create policy "landing_media_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'landing-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
