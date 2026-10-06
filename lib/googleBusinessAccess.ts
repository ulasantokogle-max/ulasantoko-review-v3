import type { SupabaseClient } from "@supabase/supabase-js";

// The scoped client retains the caller's JWT/RLS. Check before outbound work.
export async function hasGoogleBusinessAccess(client: Pick<SupabaseClient, "rpc">, businessId?: string) {
  const { data, error } = await client.rpc("v3_get_my_businesses");
  return !error && Array.isArray(data) && data.some(row =>
    typeof row?.business_id === "string" && (!businessId || row.business_id === businessId));
}
