-- UlasanToko Review V3
-- Remove obsolete Landing Page update RPC overload after cover_position was added.

drop function if exists public.v3_update_landing_page_settings(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean
);

revoke all on function public.v3_update_landing_page_settings(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean
) from public;

grant execute on function public.v3_update_landing_page_settings(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  boolean
) to authenticated;

notify pgrst, 'reload schema';
