-- Apply after 0038. Membership is distinct from permission to use provider operations.
begin;
create or replace function public.v3_is_provider_member()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.provider_admins
    where user_id = auth.uid() and status = 'active');
$$;
revoke all on function public.v3_is_provider_member() from public, anon;
grant execute on function public.v3_is_provider_member() to authenticated;

-- Every existing provider RPC calls this check, including create/list/reset PIN.
-- Missing/unknown assurance levels fail closed, including providers without factors.
create or replace function public.v3_is_provider_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.v3_is_provider_member()
    and coalesce(auth.jwt()->>'aal' = 'aal2', false);
$$;
revoke all on function public.v3_is_provider_admin() from public, anon;
grant execute on function public.v3_is_provider_admin() to authenticated;
notify pgrst, 'reload schema';
commit;
