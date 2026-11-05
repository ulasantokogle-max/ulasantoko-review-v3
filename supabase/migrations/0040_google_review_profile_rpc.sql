-- Restore the Google Review save RPC used by the V3 dashboard.
-- Does not modify existing profiles until their business member saves a change.
begin;

create or replace function public.v3_set_google_review_profile(
  p_business_id uuid,
  p_maps_url text,
  p_place_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maps_url text := btrim(p_maps_url);
  v_place_id text := btrim(p_place_id);
  v_review_url text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;
  if not exists (select 1 from public.businesses where id = p_business_id and status::text = 'active') then
    raise exception 'BUSINESS_INACTIVE';
  end if;
  if v_maps_url is null or length(v_maps_url) > 2048
     or v_maps_url !~* '^https://(maps\.app\.goo\.gl|goo\.gl|([a-z0-9-]+\.)*google\.(com|co\.id))(:443)?(/|\?|$)'
     or v_maps_url ~ '[[:space:][:cntrl:]]'
     or v_place_id is null or length(v_place_id) > 256 or v_place_id !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'INVALID_GOOGLE_REVIEW_PROFILE';
  end if;

  v_review_url := 'https://search.google.com/local/writereview?placeid=' || v_place_id;
  insert into public.google_review_profiles (business_id, maps_url, place_id, review_url, status)
  values (p_business_id, v_maps_url, v_place_id, v_review_url, 'active')
  on conflict (business_id) do update
    set maps_url = excluded.maps_url,
        place_id = excluded.place_id,
        review_url = excluded.review_url,
        status = excluded.status;

  return jsonb_build_object('success', true, 'business_id', p_business_id,
    'maps_url', v_maps_url, 'place_id', v_place_id, 'review_url', v_review_url);
end;
$$;

revoke all on function public.v3_set_google_review_profile(uuid, text, text) from public, anon;
grant execute on function public.v3_set_google_review_profile(uuid, text, text) to authenticated;
notify pgrst, 'reload schema';
commit;
