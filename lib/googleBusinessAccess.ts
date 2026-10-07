import type { SupabaseClient } from "@supabase/supabase-js";

// The scoped client retains the caller's JWT/RLS. Check before outbound work.
export async function hasGoogleBusinessAccess(client: Pick<SupabaseClient, "rpc">, businessId?: string) {
  const { data, error } = await client.rpc("v3_get_my_businesses");
  if (error || !Array.isArray(data)) return false;
  for (const row of data) {
    if (typeof row?.business_id !== "string" || (businessId && row.business_id !== businessId)) continue;
    const { data: term, error: termError } = await client.rpc("v3_get_business_term", { p_business_id: row.business_id });
    if (termError?.code === "PGRST202") return true; // Legacy project without annual terms.
    if (!termError && term?.success === true && (term.enabled === false || (term.enabled === true && Number.isFinite(term.days_remaining) && term.days_remaining >= 0))) return true;
  }
  return false;
}
