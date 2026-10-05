import type { SupabaseClient } from "@supabase/supabase-js";

// Use the provisioned public ID while keeping navigation on the V3 domain.
export function getCardPublicPath(qrUrl: string | null, cardCode: string): string {
  if (qrUrl) {
    try {
      const url = new URL(qrUrl);
      if (url.origin === "https://reputasipro.ulasantoko.space" && !url.username && !url.password && /^\/[a-f0-9]{12}\/?$/i.test(url.pathname)) {
        return "/" + url.pathname.split("/")[1].toLowerCase();
      }
    } catch { /* Existing cards can still use their legacy route. */ }
  }
  return "/" + encodeURIComponent(cardCode);
}

// Legacy codes continue directly to their existing RPCs, even before migration 0041.
export async function resolveCardCode(client: Pick<SupabaseClient, "rpc">, routeCode: string): Promise<string | null> {
  if (!/^[a-f0-9]{12}$/i.test(routeCode)) return routeCode;
  const { data, error } = await client.rpc("v3_resolve_card_code", { p_public_id: routeCode.toLowerCase() });
  return !error && typeof data === "string" && data.length > 0 ? data : null;
}
