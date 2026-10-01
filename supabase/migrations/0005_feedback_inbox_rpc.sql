-- UlasanToko Review V3
-- Secure feedback inbox RPC for authenticated business members.

create or replace function public.v3_get_feedback_inbox(
  p_business_id uuid,
  p_limit integer default 100
)
returns table (
  id uuid,
  rating smallint,
  customer_name text,
  customer_phone text,
  message text,
  category text,
  contact_consent boolean,
  status public.feedback_status,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    f.id,
    f.rating,
    f.customer_name,
    f.customer_phone,
    f.message,
    f.category,
    f.contact_consent,
    f.status,
    f.created_at
  from public.feedback_submissions f
  where f.business_id = p_business_id
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

revoke all on function public.v3_get_feedback_inbox(uuid, integer) from public;
grant execute on function public.v3_get_feedback_inbox(uuid, integer) to authenticated;
