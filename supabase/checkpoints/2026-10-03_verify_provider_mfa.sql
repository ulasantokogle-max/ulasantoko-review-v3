-- Read-only deployment checks; no session tokens or MFA secrets are printed.
select
  position('aal2' in pg_get_functiondef('public.v3_is_provider_admin()'::regprocedure)) > 0
    and position('auth.jwt()' in pg_get_functiondef('public.v3_is_provider_admin()'::regprocedure)) > 0 as provider_requires_mfa,
  not has_function_privilege('anon', 'public.v3_is_provider_member()', 'EXECUTE') as anonymous_membership_denied,
  not has_table_privilege('authenticated', 'public.provider_admins', 'INSERT')
    and not has_table_privilege('authenticated', 'public.provider_admins', 'UPDATE') as self_promotion_denied,
  position('v3_is_provider_admin()' in pg_get_functiondef('public.v3_provider_create_card(text,text,text)'::regprocedure)) > 0
    and position('v3_is_provider_admin()' in pg_get_functiondef('public.v3_provider_list_cards(integer)'::regprocedure)) > 0
    and position('v3_is_provider_admin()' in pg_get_functiondef('public.v3_provider_reset_activation_pin(uuid)'::regprocedure)) > 0 as provider_operations_guarded;
