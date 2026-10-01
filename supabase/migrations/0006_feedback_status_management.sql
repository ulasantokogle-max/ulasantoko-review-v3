-- UlasanToko Review V3
-- Secure feedback status management RPC for authenticated business members.

create or replace function public.v3_update_feedback_status(
  p_feedback_id uuid,
  p_status public.feedback_status
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feedback public.feedback_submissions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_feedback
  from public.feedback_submissions
  where id = p_feedback_id
  limit 1;

  if v_feedback.id is null then
    return jsonb_build_object(
      'success', false,
      'code', 'FEEDBACK_NOT_FOUND',
      'message', 'Feedback not found'
    );
  end if;

  if not public.is_business_member(v_feedback.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.feedback_submissions
  set status = p_status
  where id = p_feedback_id;

  return jsonb_build_object(
    'success', true,
    'feedback_id', p_feedback_id,
    'status', p_status
  );
end;
$$;

revoke all on function public.v3_update_feedback_status(uuid, public.feedback_status) from public;
grant execute on function public.v3_update_feedback_status(uuid, public.feedback_status) to authenticated;
