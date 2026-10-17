-- Lock customer management after annual expiry; public reads and feedback remain live.
-- Requires 0048. Existing businesses without a term are unaffected.
begin;
create or replace function public.v3_assert_business_term_writable(p_business_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null or public.v3_is_provider_admin() then return; end if;
  if exists(select 1 from public.v3_business_terms where business_id=p_business_id
    and expires_on < (now() at time zone 'Asia/Jakarta')::date) then
    raise exception 'BUSINESS_TERM_EXPIRED' using errcode='42501';
  end if;
end;
$$;
revoke all on function public.v3_assert_business_term_writable(uuid) from public,anon,authenticated;

create or replace function public.v3_term_row_business(p_table text,p_row jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_table='businesses' then return (p_row->>'id')::uuid; end if;
  if p_row ? 'business_id' then return (p_row->>'business_id')::uuid; end if;
  if p_row ? 'card_id' then select business_id into v_id from public.cards where id=(p_row->>'card_id')::uuid;
  elsif p_row ? 'landing_page_id' then select business_id into v_id from public.landing_pages where id=(p_row->>'landing_page_id')::uuid;
  elsif p_row ? 'landing_version_id' then
    select p.business_id into v_id from public.landing_pages p join public.landing_versions v on v.landing_page_id=p.id where v.id=(p_row->>'landing_version_id')::uuid;
  elsif p_row ? 'feedback_id' then select business_id into v_id from public.feedback_submissions where id=(p_row->>'feedback_id')::uuid;
  end if;
  return v_id;
end;
$$;
revoke all on function public.v3_term_row_business(text,jsonb) from public,anon,authenticated;
create or replace function public.v3_guard_expired_business_management()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op<>'INSERT' then perform public.v3_assert_business_term_writable(public.v3_term_row_business(tg_table_name,to_jsonb(old))); end if;
  if tg_op<>'DELETE' then
    perform public.v3_assert_business_term_writable(public.v3_term_row_business(tg_table_name,to_jsonb(new)));
    return new;
  end if;
  return old;
end;
$$;
revoke all on function public.v3_guard_expired_business_management() from public,anon,authenticated;
do $$
declare v_table text;
begin
  foreach v_table in array array['businesses','cards','card_provisioning','card_activation','landing_pages','landing_versions','landing_blocks','landing_page_settings','google_review_profiles','feedback_notes'] loop
    if to_regclass('public.'||v_table) is not null then
      execute format('drop trigger if exists v3_expired_management on public.%I',v_table);
      execute format('create trigger v3_expired_management before insert or update or delete on public.%I for each row execute function public.v3_guard_expired_business_management()',v_table);
    end if;
  end loop;
end;
$$;
-- Public visitors, including signed-in customers, may continue sending new feedback.
drop trigger if exists v3_expired_management on public.feedback_submissions;
create trigger v3_expired_management before update or delete on public.feedback_submissions
for each row execute function public.v3_guard_expired_business_management();

create or replace function public.v3_can_write_landing_media(p_name text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_business uuid; v_segment text := split_part(p_name,'/',2);
begin
  if auth.uid() is null then return false; end if;
  if public.v3_is_provider_admin() then return true; end if;
  if v_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_business := v_segment::uuid;
    return public.is_business_member(v_business) and not exists(select 1 from public.v3_business_terms where business_id=v_business and expires_on<(now() at time zone 'Asia/Jakarta')::date);
  end if;
  -- Protect existing legacy assets referenced by an expired business.
  if exists(select 1 from public.landing_page_settings s join public.v3_business_terms t on t.business_id=s.business_id
    where t.expires_on<(now() at time zone 'Asia/Jakarta')::date
      and (s.logo_url like '%/landing-media/'||p_name or s.cover_url like '%/landing-media/'||p_name or s.pdf_url like '%/landing-media/'||p_name)) then return false; end if;
  return exists(select 1 from public.businesses b where public.is_business_member(b.id)
    and not exists(select 1 from public.v3_business_terms t where t.business_id=b.id and t.expires_on<(now() at time zone 'Asia/Jakarta')::date));
end;
$$;
revoke all on function public.v3_can_write_landing_media(text) from public,anon;
grant execute on function public.v3_can_write_landing_media(text) to authenticated;
drop policy if exists v3_media_term_insert on storage.objects;
create policy v3_media_term_insert on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'landing-media' or public.v3_can_write_landing_media(name));
drop policy if exists v3_media_term_update on storage.objects;
create policy v3_media_term_update on storage.objects as restrictive for update to authenticated
using(bucket_id<>'landing-media' or public.v3_can_write_landing_media(name))
with check(bucket_id<>'landing-media' or public.v3_can_write_landing_media(name));
drop policy if exists v3_media_term_delete on storage.objects;
create policy v3_media_term_delete on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'landing-media' or public.v3_can_write_landing_media(name));
notify pgrst,'reload schema';
commit;
