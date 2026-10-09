import type { SupabaseClient } from "@supabase/supabase-js";

export const CARD_PUBLIC_ORIGIN = "https://yukreview.id";
const trustedCardOrigins = new Set([CARD_PUBLIC_ORIGIN, "https://www.yukreview.id", "https://reputasipro.ulasantoko.space"]);

// Use the provisioned public ID while keeping navigation on the V3 domain.
export function getCardPublicPath(qrUrl: string | null, cardCode: string): string {
  if (qrUrl) {
    try {
      const url = new URL(qrUrl);
      if (trustedCardOrigins.has(url.origin) && !url.username && !url.password && /^\/[a-f0-9]{12}\/?$/i.test(url.pathname)) {
        return "/" + url.pathname.split("/")[1].toLowerCase();
      }
    } catch { /* Existing cards can still use their legacy route. */ }
  }
  return "/" + encodeURIComponent(cardCode);
}

// New downloads and NFC writes use the canonical domain; old IDs stay unchanged.
export function getCardPublicUrl(qrUrl: string | null, cardCode: string): string {
  return CARD_PUBLIC_ORIGIN + getCardPublicPath(qrUrl, cardCode);
}

// Legacy codes continue directly to their existing RPCs, even before migration 0041.
export async function resolveCardCode(client: Pick<SupabaseClient, "rpc">, routeCode: string): Promise<string | null> {
  if (!/^[a-f0-9]{12}$/i.test(routeCode)) return routeCode;
  const { data, error } = await client.rpc("v3_resolve_card_code", { p_public_id: routeCode.toLowerCase() });
  return !error && typeof data === "string" && data.length > 0 ? data : null;
}
