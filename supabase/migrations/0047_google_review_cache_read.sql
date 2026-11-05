-- Allow the caller-scoped setup cache lookup; existing membership RLS still applies.
-- No write privileges or anonymous access are granted.
begin;

do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'google_review_profiles'
      and c.relrowsecurity
  ) then
    raise exception 'google_review_profiles RLS must be enabled before granting cache read';
  end if;
end;
$$;

grant select (business_id, maps_url, place_id, business_name, status)
  on public.google_review_profiles to authenticated;

notify pgrst, 'reload schema';
commit;
