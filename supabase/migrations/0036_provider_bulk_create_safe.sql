-- Additive provider bulk creation. Does not replace any existing card or activation RPC.
create table if not exists public.v3_provider_card_batches (
  id uuid primary key,
  provider_user_id uuid not null references public.users(id),
  quantity integer not null check (quantity between 1 and 100),
  card_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.v3_provider_card_batches enable row level security;
revoke all on public.v3_provider_card_batches from public, anon, authenticated;

create or replace function public.v3_provider_create_cards_bulk(
  p_request_id uuid,
  p_quantity integer,
  p_label text default null,
  p_area text default null,
  p_internal_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_results jsonb := '[]'::jsonb;
  v_result jsonb;
  v_ids uuid[] := '{}';
  v_index integer;
  v_created_today integer;
begin
  if auth.uid() is null or not public.v3_is_provider_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_request_id is null or p_quantity is null or p_quantity not between 1 and 100 then
    raise exception 'INVALID_BATCH_REQUEST';
  end if;
  if length(coalesce(p_label,'')) > 100 or length(coalesce(p_area,'')) > 100
    or length(coalesce(p_internal_code,'')) > 100 then
    raise exception 'INVALID_METADATA_LENGTH';
  end if;

  -- Serialize requests for this provider, including concurrent browser tabs.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 2026));
  if exists(select 1 from public.v3_provider_card_batches where id = p_request_id) then
    raise exception 'BATCH_ALREADY_PROCESSED';
  end if;
  select coalesce(sum(quantity),0)::integer into v_created_today
  from public.v3_provider_card_batches
  where provider_user_id = auth.uid()
    and created_at >= date_trunc('day', now() at time zone 'Asia/Jakarta') at time zone 'Asia/Jakarta';
  if v_created_today + p_quantity > 500 then
    raise exception 'DAILY_BATCH_LIMIT_EXCEEDED';
  end if;

  -- Calls the locked single-card factory; no replacement of PIN or card-code logic.
  for v_index in 1..p_quantity loop
    v_result := public.v3_provider_create_card(
      nullif(btrim(coalesce(p_label,'')), ''),
      nullif(btrim(coalesce(p_area,'')), ''),
      nullif(btrim(coalesce(p_internal_code,'')), '')
    );
    if coalesce((v_result->>'success')::boolean, false) is not true then
      raise exception 'BATCH_CARD_CREATE_FAILED';
    end if;
    v_ids := array_append(v_ids, (v_result->>'card_id')::uuid);
    v_results := v_results || jsonb_build_array(v_result);
  end loop;

  insert into public.v3_provider_card_batches(id, provider_user_id, quantity, card_ids)
  values (p_request_id, auth.uid(), p_quantity, v_ids);
  insert into public.audit_logs(user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'provider.bulk_create_cards', 'provider_card_batch', p_request_id,
    jsonb_build_object('quantity',p_quantity,'card_ids',to_jsonb(v_ids)));

  return jsonb_build_object('success',true,'batch_id',p_request_id,'quantity',p_quantity,'cards',v_results);
end;
$$;
revoke all on function public.v3_provider_create_cards_bulk(uuid,integer,text,text,text) from public, anon;
grant execute on function public.v3_provider_create_cards_bulk(uuid,integer,text,text,text) to authenticated;
notify pgrst, 'reload schema';
