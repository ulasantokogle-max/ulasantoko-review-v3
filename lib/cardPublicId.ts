import type { SupabaseClient } from "@supabase/supabase-js";

// Legacy codes continue directly to their existing RPCs, even before migration 0041.
export async function resolveCardCode(client: Pick<SupabaseClient, "rpc">, routeCode: string): Promise<string | null> {
  if (!/^[a-f0-9]{12}$/i.test(routeCode)) return routeCode;
  const { data, error } = await client.rpc("v3_resolve_card_code", { p_public_id: routeCode.toLowerCase() });
  return !error && typeof data === "string" && data.length > 0 ? data : null;
}
