import type { SupabaseClient } from "@supabase/supabase-js";

export const GOOGLE_TEMPORARY_MESSAGE = "Pengaturan Google Maps sementara belum tersedia. Silakan coba lagi nanti.";

export async function reserveGoogleRequest(client: Pick<SupabaseClient, "rpc">) {
  const { data, error } = await client.rpc("v3_reserve_google_request");
  if (error || data?.success !== true) {
    throw Object.assign(new Error(GOOGLE_TEMPORARY_MESSAGE), { status: 503, code: "GOOGLE_TEMPORARILY_UNAVAILABLE" });
  }
}
